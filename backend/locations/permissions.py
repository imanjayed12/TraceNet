from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)


ROUTE_VIEWER_ROLES = {
    "admin",
    "police",
    "government",
    "analyst",
    "ngo",
}

ROUTE_CREATOR_ROLES = {
    "admin",
    "police",
    "government",
}

HOTSPOT_VIEWER_ROLES = {
    "admin",
    "police",
    "government",
    "analyst",
    "ngo",
}

HOTSPOT_MANAGER_ROLES = {
    "admin",
    "government",
    "analyst",
}


def is_approved_user(user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and (
            user.is_superuser
            or user.access_status == "approved"
        )
    )


class CanManageRoutes(BasePermission):
    message = (
        "You do not have permission to perform "
        "this route operation."
    )

    def has_permission(self, request, view):
        user = request.user

        if not is_approved_user(user):
            return False

        if user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return user.role in ROUTE_VIEWER_ROLES

        if request.method == "POST":
            return user.role in ROUTE_CREATOR_ROLES

        if request.method == "DELETE":
            return user.role == "admin"

        if request.method in {"PUT", "PATCH"}:
            return user.role in {
                "admin",
                "police",
                "government",
                "analyst",
            }

        return False

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        if user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return user.role in ROUTE_VIEWER_ROLES

        if request.method == "DELETE":
            return user.role == "admin"

        if user.role == "admin":
            return True

        if user.role == "analyst":
            return request.method in {
                "PUT",
                "PATCH",
            }

        if user.role in {
            "police",
            "government",
        }:
            return (
                request.method in {
                    "PUT",
                    "PATCH",
                }
                and obj.created_by_id == user.id
            )

        return False


class CanManageHotspots(BasePermission):
    message = (
        "You do not have permission to perform "
        "this hotspot operation."
    )

    def has_permission(self, request, view):
        user = request.user

        if not is_approved_user(user):
            return False

        if user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return user.role in HOTSPOT_VIEWER_ROLES

        if request.method == "DELETE":
            return user.role == "admin"

        if request.method in {
            "POST",
            "PUT",
            "PATCH",
        }:
            return user.role in HOTSPOT_MANAGER_ROLES

        return False

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        if user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return user.role in HOTSPOT_VIEWER_ROLES

        if request.method == "DELETE":
            return user.role == "admin"

        if user.role == "admin":
            return True

        if user.role == "analyst":
            return request.method in {
                "PUT",
                "PATCH",
            }

        if user.role == "government":
            return (
                request.method in {
                    "PUT",
                    "PATCH",
                }
                and obj.created_by_id == user.id
            )

        return False