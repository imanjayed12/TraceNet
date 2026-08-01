from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)


ALERT_CREATOR_ROLES = {
    "admin",
    "police",
    "government",
}


class CanManageAlerts(BasePermission):
    message = (
        "You do not have permission to perform "
        "this alert operation."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if (
            not user.is_active
            or user.access_status != "approved"
        ):
            return False

        if request.method in SAFE_METHODS:
            return True

        if request.method == "POST":
            return user.role in ALERT_CREATOR_ROLES

        if request.method == "DELETE":
            return user.role == "admin"

        return user.role in ALERT_CREATOR_ROLES

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        if request.method in SAFE_METHODS:
            return (
                user.is_superuser
                or obj.created_by_id == user.id
                or obj.recipient_records.filter(
                    user=user,
                ).exists()
            )

        if request.method == "DELETE":
            return (
                user.is_superuser
                or user.role == "admin"
            )

        return (
            user.is_superuser
            or user.role == "admin"
            or obj.created_by_id == user.id
        )


class IsAlertRecipient(BasePermission):
    message = (
        "You are not a recipient of this alert."
    )

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (
                user.is_superuser
                or user.access_status == "approved"
            )
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        return (
            user.is_superuser
            or obj.user_id == user.id
        )