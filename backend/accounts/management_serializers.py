from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )
    access_status_display = serializers.CharField(
        source="get_access_status_display",
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "organization",
            "role",
            "role_display",
            "access_status",
            "access_status_display",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
        )
        read_only_fields = fields


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "role",
            "access_status",
            "is_active",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        target = self.instance

        if not actor or not target:
            return attrs

        next_role = attrs.get(
            "role",
            target.role,
        )
        next_access_status = attrs.get(
            "access_status",
            target.access_status,
        )
        next_is_active = attrs.get(
            "is_active",
            target.is_active,
        )

        if (
            target.is_superuser
            and not actor.is_superuser
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Only a superuser can modify another "
                        "superuser account."
                    )
                }
            )

        if target.pk == actor.pk:
            if next_role != User.Role.ADMIN:
                raise serializers.ValidationError(
                    {
                        "role": (
                            "You cannot remove your own "
                            "administrator role."
                        )
                    }
                )

            if (
                next_access_status
                != User.AccessStatus.APPROVED
            ):
                raise serializers.ValidationError(
                    {
                        "access_status": (
                            "You cannot remove your own "
                            "approved access."
                        )
                    }
                )

            if not next_is_active:
                raise serializers.ValidationError(
                    {
                        "is_active": (
                            "You cannot deactivate your own "
                            "account."
                        )
                    }
                )

        currently_protected_admin = (
            target.role == User.Role.ADMIN
            and target.access_status
            == User.AccessStatus.APPROVED
            and target.is_active
        )
        will_remain_protected_admin = (
            next_role == User.Role.ADMIN
            and next_access_status
            == User.AccessStatus.APPROVED
            and next_is_active
        )

        if (
            currently_protected_admin
            and not will_remain_protected_admin
        ):
            another_admin_exists = (
                User.objects.filter(
                    role=User.Role.ADMIN,
                    access_status=(
                        User.AccessStatus.APPROVED
                    ),
                    is_active=True,
                )
                .exclude(pk=target.pk)
                .exists()
            )

            if not another_admin_exists:
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "This operation would remove the "
                            "last active approved administrator."
                        )
                    }
                )

        if (
            next_access_status
            == User.AccessStatus.REJECTED
        ):
            attrs["is_active"] = False

        return attrs