from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    CaseAccessGrant,
    EmergencyAccessInvitation,
)


User = get_user_model()


class EmergencyInvitationAcceptSerializer(
    serializers.Serializer,
):
    token = serializers.UUIDField(
        write_only=True,
    )
    email = serializers.EmailField(
        write_only=True,
    )
    full_name = serializers.CharField(
        max_length=150,
        write_only=True,
    )
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        write_only=True,
    )
    organization = serializers.CharField(
        max_length=150,
        write_only=True,
    )
    password = serializers.CharField(
        write_only=True,
        style={
            "input_type": "password",
        },
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={
            "input_type": "password",
        },
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_full_name(self, value):
        return value.strip()

    def validate_organization(self, value):
        organization = value.strip()

        if len(organization) < 3:
            raise serializers.ValidationError(
                "Provide the officer's organization."
            )

        return organization

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

        try:
            invitation = (
                EmergencyAccessInvitation.objects.select_related(
                    "case",
                    "sponsor",
                ).get(
                    token=attrs["token"],
                )
            )
        except EmergencyAccessInvitation.DoesNotExist as error:
            raise serializers.ValidationError(
                {
                    "token": (
                        "This emergency invitation is invalid."
                    )
                }
            ) from error

        if (
            invitation.status
            != EmergencyAccessInvitation.Status.PENDING
        ):
            raise serializers.ValidationError(
                {
                    "token": (
                        "This invitation is no longer pending."
                    )
                }
            )

        if invitation.expires_at <= timezone.now():
            raise serializers.ValidationError(
                {
                    "token": (
                        "This emergency invitation has expired."
                    )
                }
            )

        if (
            invitation.invitee_email.lower()
            != attrs["email"].lower()
        ):
            raise serializers.ValidationError(
                {
                    "email": (
                        "This email does not match the invitation."
                    )
                }
            )

        existing_user = User.objects.filter(
            email__iexact=attrs["email"],
        ).first()

        if existing_user and (
            existing_user.is_superuser
            or existing_user.access_status
            == User.AccessStatus.APPROVED
            or existing_user.is_active
        ):
            raise serializers.ValidationError(
                {
                    "email": (
                        "An active or approved account already "
                        "exists for this email."
                    )
                }
            )

        temporary_user = existing_user or User(
            email=attrs["email"],
            full_name=attrs["full_name"],
            organization=attrs["organization"],
            role=User.Role.POLICE,
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

        attrs["invitation"] = invitation
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        invitation = (
            EmergencyAccessInvitation.objects.select_for_update()
            .select_related(
                "case",
                "sponsor",
            )
            .get(
                pk=validated_data.pop("invitation").pk,
            )
        )

        if (
            invitation.status
            != EmergencyAccessInvitation.Status.PENDING
            or invitation.expires_at <= timezone.now()
        ):
            raise serializers.ValidationError(
                {
                    "token": (
                        "This invitation is no longer valid."
                    )
                }
            )

        token = validated_data.pop("token")
        password = validated_data.pop("password")
        email = validated_data.pop("email")

        user = User.objects.filter(
            email__iexact=email,
        ).first()

        if user:
            if (
                user.is_superuser
                or user.access_status
                == User.AccessStatus.APPROVED
                or user.is_active
            ):
                raise serializers.ValidationError(
                    {
                        "email": (
                            "This account cannot use emergency "
                            "registration."
                        )
                    }
                )

            user.full_name = validated_data["full_name"]
            user.phone = validated_data.get("phone", "")
            user.organization = validated_data[
                "organization"
            ]
            user.role = User.Role.POLICE
            user.access_status = User.AccessStatus.EMERGENCY
            user.is_active = True
            user.is_staff = False
            user.is_superuser = False
            user.set_password(password)
            user.save()
        else:
            user = User.objects.create_user(
                email=email,
                password=password,
                full_name=validated_data["full_name"],
                phone=validated_data.get("phone", ""),
                organization=validated_data["organization"],
                role=User.Role.POLICE,
                access_status=User.AccessStatus.EMERGENCY,
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )

        grant, _ = CaseAccessGrant.objects.update_or_create(
            case=invitation.case,
            user=user,
            defaults={
                "invitation": invitation,
                "granted_by": invitation.sponsor,
                "access_level": (
                    CaseAccessGrant.AccessLevel.LIMITED
                ),
                "expires_at": invitation.expires_at,
                "is_active": True,
                "revoked_by": None,
                "revoked_at": None,
                "revocation_reason": "",
            },
        )

        invitation.status = (
            EmergencyAccessInvitation.Status.ACCEPTED
        )
        invitation.accepted_by = user
        invitation.accepted_at = timezone.now()
        invitation.save(
            update_fields=(
                "status",
                "accepted_by",
                "accepted_at",
            )
        )

        return {
            "user": user,
            "grant": grant,
            "invitation": invitation,
            "token": token,
        }