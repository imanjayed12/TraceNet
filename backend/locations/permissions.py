from rest_framework.permissions import BasePermission, SAFE_METHODS


class CanManageRoutes(BasePermission):
    message = "You do not have permission to perform this route operation."

    route_manager_roles = {
        "admin",
        "police",
        "government",
        "analyst",
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        if request.method == "DELETE":
            return user.is_superuser or user.role == "admin"

        return (
            user.is_superuser
            or user.is_staff
            or user.role in self.route_manager_roles
        )