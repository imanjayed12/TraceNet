from rest_framework.permissions import BasePermission


class CanManageUsers(BasePermission):
    message = (
        "Only approved administrators can manage users."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return (
            user.role == "admin"
            and user.is_staff
            and user.is_active
            and user.access_status == "approved"
        )