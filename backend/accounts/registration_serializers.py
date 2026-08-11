from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from rest_framework import serializers


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        min_length=2,
        max_length=150,
        trim_whitespace=True,
    )
    phone = serializers.CharField(
        max_length=20,
        trim_whitespace=True,
        allow_blank=True,
        required=False,
    )
    organization = serializers.CharField(
        min_length=2,
        max_length=150,
        trim_whitespace=True,
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    role = serializers.ChoiceField(
        choices=(
            (User.Role.POLICE, "Police"),
            (User.Role.NGO, "NGO"),
            (User.Role.ANALYST, "Analyst"),
            (User.Role.GOVERNMENT, "Government"),
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "full_name",
            "phone",
            "organization",
            "role",
            "password",
            "password_confirm",
        )

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(
            email__iexact=email,
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.pop(
            "password_confirm",
            None,
        )

        if password != password_confirm:
            raise serializers.ValidationError(
                {
                    "password_confirm": (
                        "The two passwords do not match."
                    )
                }
            )

        temporary_user = User(
            email=attrs.get("email"),
            full_name=attrs.get("full_name"),
            phone=attrs.get("phone", ""),
            organization=attrs.get("organization", ""),
            role=attrs.get("role"),
        )

        try:
            validate_password(
                password,
                user=temporary_user,
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                {
                    "password": list(error.messages),
                }
            ) from error

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            is_active=False,
            access_status=User.AccessStatus.PENDING,
            **validated_data,
        )

        return user
