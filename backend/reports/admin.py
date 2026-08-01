from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "report_type",
        "output_format",
        "status",
        "generated_by",
        "date_from",
        "date_to",
        "generated_at",
        "created_at",
    )

    list_filter = (
        "report_type",
        "output_format",
        "status",
        "created_at",
    )

    search_fields = (
        "title",
        "generated_by__email",
        "generated_by__full_name",
    )

    autocomplete_fields = (
        "generated_by",
    )

    readonly_fields = (
        "status",
        "summary",
        "error_message",
        "generated_at",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Report configuration",
            {
                "fields": (
                    "title",
                    "report_type",
                    "output_format",
                    "date_from",
                    "date_to",
                    "filters",
                    "generated_by",
                )
            },
        ),
        (
            "Generation result",
            {
                "fields": (
                    "status",
                    "summary",
                    "error_message",
                    "generated_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    ordering = (
        "-created_at",
    )
    list_per_page = 30

    def has_delete_permission(
        self,
        request,
        obj=None,
    ):
        return request.user.is_superuser