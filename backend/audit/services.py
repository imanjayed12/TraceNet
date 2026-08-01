from .models import AuditLog


SENSITIVE_KEYS = {
    "password",
    "password_confirm",
    "old_password",
    "new_password",
    "token",
    "access",
    "refresh",
    "secret",
    "authorization",
}


def get_client_ip(request):
    if request is None:
        return None

    forwarded_for = request.META.get(
        "HTTP_X_FORWARDED_FOR",
        "",
    )

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR") or None


def sanitize_metadata(value):
    if isinstance(value, dict):
        sanitized = {}

        for key, item in value.items():
            normalized_key = str(key).lower()

            if normalized_key in SENSITIVE_KEYS:
                sanitized[str(key)] = "[REDACTED]"
            else:
                sanitized[str(key)] = sanitize_metadata(item)

        return sanitized

    if isinstance(value, (list, tuple)):
        return [
            sanitize_metadata(item)
            for item in value
        ]

    if value is None or isinstance(
        value,
        (str, int, float, bool),
    ):
        return value

    return str(value)


def record_audit_event(
    *,
    action,
    request=None,
    actor=None,
    actor_email="",
    resource_type="",
    resource_id="",
    resource_label="",
    status_code=None,
    success=True,
    metadata=None,
):
    if actor is None and request is not None:
        request_user = getattr(request, "user", None)

        if (
            request_user is not None
            and request_user.is_authenticated
        ):
            actor = request_user

    if actor and not actor_email:
        actor_email = actor.email

    request_method = ""
    request_path = ""
    ip_address = None
    user_agent = ""

    if request is not None:
        request_method = request.method
        request_path = request.path
        ip_address = get_client_ip(request)
        user_agent = request.META.get(
            "HTTP_USER_AGENT",
            "",
        )[:500]

    return AuditLog.objects.create(
        actor=actor,
        actor_email=actor_email,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else "",
        resource_label=resource_label[:255],
        request_method=request_method[:10],
        request_path=request_path[:500],
        ip_address=ip_address,
        user_agent=user_agent,
        status_code=status_code,
        success=success,
        metadata=sanitize_metadata(metadata or {}),
    )