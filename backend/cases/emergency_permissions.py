from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)


class CanManageEmergencyInvitations(BasePermission):
    message = (
        "Only approved police officers and administrators "
        "can manage emergency invitations."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not user.is_active:
            return False

        if user.access_status != "approved":
            return False

        return user.role in {
            "admin",
            "police",
        }

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        if user.is_superuser or user.role == "admin":
            return True

        if request.method in SAFE_METHODS:
            return obj.sponsor_id == user.id

        return obj.sponsor_id == user.id
class CanRevokeEmergencyGrants(BasePermission):
    message = (
        "Only the sponsoring officer or an administrator "
        "can revoke this emergency access grant."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return bool(
            user.is_active
            and user.access_status == "approved"
            and user.role in {
                "admin",
                "police",
            }
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

        return obj.granted_by_id == user.id