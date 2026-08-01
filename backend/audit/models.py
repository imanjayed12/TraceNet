from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN = "login", "Login"
        LOGIN_FAILED = "login_failed", "Login failed"
        LOGOUT = "logout", "Logout"

        CREATE = "create", "Create"
        VIEW = "view", "View"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        EXPORT = "export", "Export"

        APPROVE_USER = "approve_user", "Approve user"
        REJECT_USER = "reject_user", "Reject user"

        EMERGENCY_INVITE = (
            "emergency_invite",
            "Emergency invitation created",
        )
        EMERGENCY_ACCESS = (
            "emergency_access",
            "Emergency access accepted",
        )
        EMERGENCY_REVOKE = (
            "emergency_revoke",
            "Emergency access revoked",
        )

        ALERT_READ = "alert_read", "Alert marked as read"
        ALERT_ACKNOWLEDGE = (
            "alert_acknowledge",
            "Alert acknowledged",
        )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    actor_email = models.EmailField(
        blank=True,
        help_text=(
            "Email snapshot retained if the user is later deleted."
        ),
    )

    action = models.CharField(
        max_length=40,
        choices=Action.choices,
    )

    resource_type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Example: case, route, hotspot, alert, or user.",
    )
    resource_id = models.CharField(
        max_length=100,
        blank=True,
    )
    resource_label = models.CharField(
        max_length=255,
        blank=True,
        help_text="Safe, non-sensitive resource description.",
    )

    request_method = models.CharField(
        max_length=10,
        blank=True,
    )
    request_path = models.CharField(
        max_length=500,
        blank=True,
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
    )

    status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )
    success = models.BooleanField(
        default=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Store only safe metadata. Never store passwords, "
            "tokens, or confidential case details."
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(
                fields=("actor", "created_at"),
            ),
            models.Index(
                fields=("action", "created_at"),
            ),
            models.Index(
                fields=(
                    "resource_type",
                    "resource_id",
                    "created_at",
                ),
            ),
            models.Index(
                fields=("success", "created_at"),
            ),
        ]

    def __str__(self):
        actor = self.actor_email or "anonymous"
        resource = self.resource_label or self.resource_type
        return f"{actor} — {self.get_action_display()} — {resource}"