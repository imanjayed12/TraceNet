from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "actor_email",
        "action",
        "resource_type",
        "resource_label",
        "success",
        "status_code",
        "ip_address",
    )

    list_filter = (
        "action",
        "success",
        "resource_type",
        "created_at",
    )

    search_fields = (
        "actor_email",
        "resource_type",
        "resource_id",
        "resource_label",
        "request_path",
        "ip_address",
    )

    readonly_fields = (
        "actor",
        "actor_email",
        "action",
        "resource_type",
        "resource_id",
        "resource_label",
        "request_method",
        "request_path",
        "ip_address",
        "user_agent",
        "status_code",
        "success",
        "metadata",
        "created_at",
    )

    ordering = (
        "-created_at",
    )

    date_hierarchy = "created_at"
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(
        self,
        request,
        obj=None,
    ):
        return request.user.is_superuser

    def has_delete_permission(
        self,
        request,
        obj=None,
    ):
        return False

    def get_readonly_fields(
        self,
        request,
        obj=None,
    ):
        return self.readonly_fields