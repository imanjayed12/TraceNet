from rest_framework.permissions import BasePermission


class CanManageReports(BasePermission):
    message = (
        "Only approved administrators, government "
        "authorities, and analysts can access reports."
    )

    allowed_roles = {
        "admin",
        "government",
        "analyst",
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return (
            user.is_active
            and user.access_status == "approved"
            and user.role in self.allowed_roles
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        if user.is_superuser or user.role == "admin":
            return True

        return obj.generated_by_id == user.id