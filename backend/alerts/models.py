from django.db import models


class Alert(models.Model):
    class AlertType(models.TextChoices):
        CASE = "case", "Case alert"
        HOTSPOT = "hotspot", "Hotspot alert"
        ROUTE = "route", "Route alert"
        EMERGENCY_ACCESS = (
            "emergency_access",
            "Emergency access alert",
        )
        SYSTEM = "system", "System alert"
        MANUAL = "manual", "Manual alert"

    class Severity(models.TextChoices):
        INFO = "info", "Information"
        WARNING = "warning", "Warning"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RESOLVED = "resolved", "Resolved"
        CANCELLED = "cancelled", "Cancelled"

    alert_type = models.CharField(
        max_length=30,
        choices=AlertType.choices,
    )
    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    title = models.CharField(
        max_length=180,
    )
    message = models.TextField(
        help_text=(
            "Use anonymized information only. "
            "Do not include names, phone numbers, "
            "NID numbers, or exact private addresses."
        ),
    )

    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
    )
    hotspot = models.ForeignKey(
        "locations.Hotspot",
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
    )
    route = models.ForeignKey(
        "locations.Route",
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
    )

    target_roles = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Roles that should receive this alert. "
            "An empty list means explicitly selected users only."
        ),
    )

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_alerts",
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    resolved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="resolved_alerts",
        null=True,
        blank=True,
    )
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-created_at",
        )
        indexes = [
            models.Index(
                fields=(
                    "severity",
                    "status",
                )
            ),
            models.Index(
                fields=(
                    "alert_type",
                    "status",
                )
            ),
            models.Index(
                fields=(
                    "expires_at",
                    "status",
                )
            ),
        ]

    def __str__(self):
        return f"{self.get_severity_display()}: {self.title}"


class AlertRecipient(models.Model):
    class DeliveryStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"

    alert = models.ForeignKey(
        Alert,
        on_delete=models.CASCADE,
        related_name="recipient_records",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="alert_records",
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.DELIVERED,
    )
    is_read = models.BooleanField(
        default=False,
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    is_acknowledged = models.BooleanField(
        default=False,
    )
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = (
            "-created_at",
        )
        constraints = [
            models.UniqueConstraint(
                fields=(
                    "alert",
                    "user",
                ),
                name="unique_alert_recipient",
            ),
        ]
        indexes = [
            models.Index(
                fields=(
                    "user",
                    "is_read",
                )
            ),
            models.Index(
                fields=(
                    "user",
                    "is_acknowledged",
                )
            ),
            models.Index(
                fields=(
                    "delivery_status",
                    "created_at",
                )
            ),
        ]

    def __str__(self):
        return f"{self.user.email} ← {self.alert.title}"