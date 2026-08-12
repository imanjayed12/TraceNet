from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
)

from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        min_length=2,
        max_length=150,
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20,
    )
    organization = serializers.CharField(
        min_length=2,
        max_length=150,
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
            "access_status",
            "access_status_display",
            "is_active",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "access_status",
            "access_status_display",
            "is_active",
        )

    def validate_full_name(self, value):
        return value.strip()

    def validate_phone(self, value):
        return value.strip()

    def validate_organization(self, value):
        return value.strip()


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )

    def validate_current_password(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.check_password(value):
            raise serializers.ValidationError(
                "The current password is incorrect."
            )

        return value

    def validate(self, attrs):
        user = self.context["request"].user
        new_password = attrs.get("new_password")
        new_password_confirm = attrs.get(
            "new_password_confirm",
        )

        if new_password != new_password_confirm:
            raise serializers.ValidationError(
                {
                    "new_password_confirm": (
                        "The two new passwords do not match."
                    )
                }
            )

        if user.check_password(new_password):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "The new password must be different "
                        "from the current password."
                    )
                }
            )

        try:
            validate_password(
                new_password,
                user=user,
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                {
                    "new_password": list(error.messages),
                }
            ) from error

        return attrs


class CustomTokenObtainPairSerializer(
    TokenObtainPairSerializer,
):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["email"] = user.email
        token["full_name"] = user.full_name
        token["role"] = user.role
        token["access_status"] = user.access_status

        return token

    def validate(self, attrs):
        email = str(
            attrs.get("email", "")
        ).strip().lower()
        password = attrs.get("password")

        candidate = User.objects.filter(
            email__iexact=email,
        ).first()

        valid_candidate_password = bool(
            candidate
            and password
            and candidate.check_password(password)
        )

        if valid_candidate_password:
            if (
                candidate.access_status
                == User.AccessStatus.PENDING
            ):
                raise AuthenticationFailed(
                    "Account approval is pending.",
                    code="account_pending",
                )

            if (
                candidate.access_status
                == User.AccessStatus.REJECTED
            ):
                raise AuthenticationFailed(
                    "This account request was rejected.",
                    code="account_rejected",
                )

            allowed_statuses = {
                User.AccessStatus.APPROVED,
                User.AccessStatus.EMERGENCY,
            }

            if (
                candidate.access_status
                not in allowed_statuses
            ):
                raise AuthenticationFailed(
                    (
                        "This account is not authorized "
                        "for access."
                    ),
                    code="account_not_authorized",
                )

            if not candidate.is_active:
                raise AuthenticationFailed(
                    "This account is inactive.",
                    code="account_inactive",
                )

        normalized_attrs = {
            **attrs,
            "email": email,
        }
        data = super().validate(normalized_attrs)
        data["user"] = UserProfileSerializer(
            self.user,
        ).data

        return data