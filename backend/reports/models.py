from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Report(models.Model):
    class ReportType(models.TextChoices):
        EXECUTIVE_SUMMARY = (
            "executive_summary",
            "Executive summary",
        )
        CASE_ANALYSIS = (
            "case_analysis",
            "Case analysis",
        )
        GEOGRAPHIC_RISK = (
            "geographic_risk",
            "Geographic risk analysis",
        )
        ROUTE_ANALYSIS = (
            "route_analysis",
            "Route analysis",
        )
        ALERT_ANALYSIS = (
            "alert_analysis",
            "Alert analysis",
        )
        AUDIT_COMPLIANCE = (
            "audit_compliance",
            "Audit and compliance",
        )

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class OutputFormat(models.TextChoices):
        JSON = "json", "JSON"
        CSV = "csv", "CSV"
        PDF = "pdf", "PDF"

    title = models.CharField(
        max_length=200,
    )
    report_type = models.CharField(
        max_length=30,
        choices=ReportType.choices,
    )
    output_format = models.CharField(
        max_length=10,
        choices=OutputFormat.choices,
        default=OutputFormat.JSON,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    date_from = models.DateField(
        null=True,
        blank=True,
    )
    date_to = models.DateField(
        null=True,
        blank=True,
    )

    filters = models.JSONField(
        default=dict,
        blank=True,
        help_text="Non-sensitive filters used to generate the report.",
    )
    summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Aggregated statistics generated for the report.",
    )

    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="generated_reports",
        null=True,
        blank=True,
    )
    error_message = models.TextField(
        blank=True,
    )

    generated_at = models.DateTimeField(
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
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(
                fields=("report_type", "status"),
            ),
            models.Index(
                fields=("generated_by", "created_at"),
            ),
            models.Index(
                fields=("date_from", "date_to"),
            ),
        ]

    def clean(self):
        super().clean()

        if (
            self.date_from
            and self.date_to
            and self.date_from > self.date_to
        ):
            raise ValidationError(
                {
                    "date_to": (
                        "The end date cannot be earlier "
                        "than the start date."
                    )
                }
            )

    def __str__(self):
        return (
            f"{self.title} "
            f"({self.get_report_type_display()})"
        )