from django.urls import Resolver404, resolve

from .models import AuditLog
from .services import record_audit_event


METHOD_ACTIONS = {
    "POST": AuditLog.Action.CREATE,
    "PUT": AuditLog.Action.UPDATE,
    "PATCH": AuditLog.Action.UPDATE,
    "DELETE": AuditLog.Action.DELETE,
}

EXCLUDED_URL_NAMES = {
    "login",
    "logout",
    "token-refresh",
}


class ApiMutationAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if not request.path.startswith("/api/"):
            return response

        action = METHOD_ACTIONS.get(request.method)

        if action is None:
            return response

        try:
            match = resolve(request.path)
        except Resolver404:
            return response

        url_name = match.url_name or ""

        if url_name in EXCLUDED_URL_NAMES:
            return response

        user = getattr(request, "user", None)

        if (
            user is None
            or not user.is_authenticated
        ):
            return response

        namespace = match.namespace or "api"
        resource_id = self._get_resource_id(
            match.kwargs,
        )

        record_audit_event(
            action=action,
            request=request,
            actor=user,
            resource_type=namespace,
            resource_id=resource_id,
            resource_label=url_name.replace(
                "-",
                " ",
            ),
            status_code=response.status_code,
            success=200 <= response.status_code < 400,
            metadata={
                "url_name": url_name,
            },
        )

        return response

    @staticmethod
    def _get_resource_id(kwargs):
        preferred_keys = (
            "reference_code",
            "anonymous_code",
            "token",
            "pk",
            "slug",
        )

        for key in preferred_keys:
            value = kwargs.get(key)

            if value is not None:
                return str(value)

        return ""