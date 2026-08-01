from django.contrib import admin
from django.utils import timezone

from .models import (
    Alert,
    AlertRecipient,
)


class AlertRecipientInline(admin.TabularInline):
    model = AlertRecipient
    extra = 0
    autocomplete_fields = (
        "user",
    )
    readonly_fields = (
        "created_at",
        "read_at",
        "acknowledged_at",
    )
    fields = (
        "user",
        "delivery_status",
        "is_read",
        "read_at",
        "is_acknowledged",
        "acknowledged_at",
        "created_at",
    )


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "alert_type",
        "severity",
        "status",
        "case",
        "hotspot",
        "route",
        "created_by",
        "expires_at",
        "created_at",
    )

    list_filter = (
        "alert_type",
        "severity",
        "status",
        "created_at",
    )

    search_fields = (
        "title",
        "message",
        "case__reference_code",
        "case__title",
        "hotspot__name",
        "route__name",
    )

    autocomplete_fields = (
        "case",
        "hotspot",
        "route",
        "created_by",
        "resolved_by",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "resolved_at",
    )

    fieldsets = (
        (
            "Alert identity",
            {
                "fields": (
                    "title",
                    "alert_type",
                    "severity",
                    "status",
                    "message",
                )
            },
        ),
        (
            "Related intelligence",
            {
                "fields": (
                    "case",
                    "hotspot",
                    "route",
                )
            },
        ),
        (
            "Audience and expiry",
            {
                "fields": (
                    "target_roles",
                    "expires_at",
                )
            },
        ),
        (
            "Audit information",
            {
                "fields": (
                    "created_by",
                    "resolved_by",
                    "resolved_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    inlines = (
        AlertRecipientInline,
    )

    ordering = (
        "-created_at",
    )
    list_per_page = 25

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user

        if obj.status == Alert.Status.RESOLVED:
            if not obj.resolved_at:
                obj.resolved_at = timezone.now()

            if not obj.resolved_by_id:
                obj.resolved_by = request.user
        else:
            obj.resolved_at = None
            obj.resolved_by = None

        super().save_model(
            request,
            obj,
            form,
            change,
        )


@admin.register(AlertRecipient)
class AlertRecipientAdmin(admin.ModelAdmin):
    list_display = (
        "alert",
        "user",
        "delivery_status",
        "is_read",
        "is_acknowledged",
        "created_at",
    )

    list_filter = (
        "delivery_status",
        "is_read",
        "is_acknowledged",
        "created_at",
    )

    search_fields = (
        "alert__title",
        "user__email",
        "user__full_name",
    )

    autocomplete_fields = (
        "alert",
        "user",
    )

    readonly_fields = (
        "created_at",
        "read_at",
        "acknowledged_at",
    )

    ordering = (
        "-created_at",
    )