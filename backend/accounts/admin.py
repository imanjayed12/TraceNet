from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    ordering = (
        "email",
    )

    list_display = (
        "email",
        "full_name",
        "role",
        "organization",
        "access_status",
        "is_active",
        "is_staff",
    )

    list_filter = (
        "access_status",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
    )

    search_fields = (
        "email",
        "full_name",
        "organization",
    )

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),
        (
            "Personal information",
            {
                "fields": (
                    "full_name",
                    "phone",
                    "organization",
                    "role",
                    "access_status",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {
                "fields": (
                    "last_login",
                    "date_joined",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": (
                    "wide",
                ),
                "fields": (
                    "email",
                    "full_name",
                    "role",
                    "access_status",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    filter_horizontal = (
        "groups",
        "user_permissions",
    )

    actions = (
        "approve_selected_users",
        "reject_selected_users",
    )

    @admin.action(
        description="Approve selected registrations"
    )
    def approve_selected_users(self, request, queryset):
        updated = queryset.exclude(
            is_superuser=True,
        ).update(
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.message_user(
            request,
            f"{updated} user(s) approved successfully.",
        )

    @admin.action(
        description="Reject selected registrations"
    )
    def reject_selected_users(self, request, queryset):
        updated = queryset.exclude(
            is_superuser=True,
        ).update(
            access_status=User.AccessStatus.REJECTED,
            is_active=False,
        )

        self.message_user(
            request,
            f"{updated} user(s) rejected successfully.",
        )

    def save_model(self, request, obj, form, change):
        if not obj.is_superuser:
            if obj.access_status in (
                User.AccessStatus.PENDING,
                User.AccessStatus.REJECTED,
            ):
                obj.is_active = False

            elif obj.access_status in (
                User.AccessStatus.APPROVED,
                User.AccessStatus.EMERGENCY,
            ):
                obj.is_active = True

        super().save_model(
            request,
            obj,
            form,
            change,
        )