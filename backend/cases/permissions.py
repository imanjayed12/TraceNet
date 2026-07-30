from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)


CASE_VIEWER_ROLES = {
    "admin",
    "police",
    "government",
    "analyst",
    "ngo",
}

CASE_CREATOR_ROLES = {
    "admin",
    "police",
    "government",
    "ngo",
}

CASE_MANAGER_ROLES = {
    "admin",
    "police",
    "government",
}


class CanManageCases(BasePermission):
    message = (
        "You do not have permission to perform "
        "this case operation."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return (
                user.is_superuser
                or user.role in CASE_VIEWER_ROLES
            )

        if request.method == "POST":
            return (
                user.is_superuser
                or user.role in CASE_CREATOR_ROLES
            )

        if request.method == "DELETE":
            return (
                user.is_superuser
                or user.role == "admin"
            )

        return (
            user.is_superuser
            or user.role in CASE_MANAGER_ROLES
        )


class CanManageCaseUpdates(BasePermission):
    message = (
        "You do not have permission to access "
        "case updates."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return (
                user.is_superuser
                or user.role in CASE_VIEWER_ROLES
            )

        if request.method == "POST":
            return (
                user.is_superuser
                or user.role in CASE_CREATOR_ROLES
            )

        return False


class CanManageCaseRoutes(BasePermission):
    message = (
        "You do not have permission to manage "
        "case-route links."
    )

    allowed_roles = {
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
            return (
                user.is_superuser
                or user.role in CASE_VIEWER_ROLES
            )

        if request.method == "DELETE":
            return (
                user.is_superuser
                or user.role == "admin"
            )

        return (
            user.is_superuser
            or user.role in self.allowed_roles
        )


class CanManageVictimProfiles(BasePermission):
    message = (
        "You do not have permission to access "
        "protected victim profiles."
    )

    allowed_roles = {
        "admin",
        "police",
        "government",
        "ngo",
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method == "DELETE":
            return (
                user.is_superuser
                or user.role == "admin"
            )

        return (
            user.is_superuser
            or user.role in self.allowed_roles
        )