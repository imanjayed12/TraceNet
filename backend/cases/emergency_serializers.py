from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import (
    Case,
    CaseAccessGrant,
    EmergencyAccessInvitation,
)


class EmergencyAccessInvitationSerializer(
    serializers.ModelSerializer,
):
    case_reference = serializers.CharField(
        source="case.reference_code",
        read_only=True,
    )
    case_title = serializers.CharField(
        source="case.title",
        read_only=True,
    )
    sponsor_email = serializers.EmailField(
        source="sponsor.email",
        read_only=True,
    )
    accepted_by_email = serializers.EmailField(
        source="accepted_by.email",
        read_only=True,
        allow_null=True,
    )
    is_valid = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = EmergencyAccessInvitation
        fields = (
            "id",
            "token",
            "case",
            "case_reference",
            "case_title",
            "invitee_email",
            "sponsor_email",
            "reason",
            "expires_at",
            "status",
            "accepted_by_email",
            "accepted_at",
            "revoked_at",
            "is_valid",
            "created_at",
        )
        read_only_fields = (
            "id",
            "token",
            "sponsor_email",
            "status",
            "accepted_by_email",
            "accepted_at",
            "revoked_at",
            "is_valid",
            "created_at",
        )


class EmergencyAccessInvitationCreateSerializer(
    serializers.ModelSerializer,
):
    case_reference = serializers.SlugRelatedField(
        source="case",
        slug_field="reference_code",
        queryset=Case.objects.all(),
    )
    expires_in_hours = serializers.IntegerField(
        write_only=True,
        min_value=1,
        max_value=24,
        default=6,
    )

    class Meta:
        model = EmergencyAccessInvitation
        fields = (
            "case_reference",
            "invitee_email",
            "reason",
            "expires_in_hours",
        )

    def validate_invitee_email(self, value):
        return value.strip().lower()

    def validate_reason(self, value):
        reason = value.strip()

        if len(reason) < 15:
            raise serializers.ValidationError(
                "Provide a clear reason of at least 15 characters."
            )

        return reason

    def validate(self, attrs):
        case = attrs["case"]
        invitee_email = attrs["invitee_email"]

        duplicate_exists = (
            EmergencyAccessInvitation.objects.filter(
                case=case,
                invitee_email__iexact=invitee_email,
                status=(
                    EmergencyAccessInvitation.Status.PENDING
                ),
                expires_at__gt=timezone.now(),
            ).exists()
        )

        if duplicate_exists:
            raise serializers.ValidationError(
                {
                    "invitee_email": (
                        "A valid pending invitation already "
                        "exists for this email and case."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        expires_in_hours = validated_data.pop(
            "expires_in_hours",
        )
        sponsor = self.context["request"].user

        return EmergencyAccessInvitation.objects.create(
            sponsor=sponsor,
            expires_at=(
                timezone.now()
                + timedelta(hours=expires_in_hours)
            ),
            **validated_data,
        )


class CaseAccessGrantSerializer(
    serializers.ModelSerializer,
):
    case_reference = serializers.CharField(
        source="case.reference_code",
        read_only=True,
    )
    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    granted_by_email = serializers.EmailField(
        source="granted_by.email",
        read_only=True,
    )
    is_valid = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = CaseAccessGrant
        fields = (
            "id",
            "case_reference",
            "user_email",
            "access_level",
            "expires_at",
            "is_active",
            "granted_by_email",
            "revoked_by",
            "revoked_at",
            "revocation_reason",
            "is_valid",
            "created_at",
        )
        read_only_fields = fields
class CaseAccessGrantRevokeSerializer(
    serializers.Serializer,
):
    reason = serializers.CharField(
        max_length=255,
        min_length=10,
    )

    def validate_reason(self, value):
        return value.strip()