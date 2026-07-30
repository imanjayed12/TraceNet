from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from locations.models import District, Route
from locations.serializers import (
    DistrictSerializer,
    RouteSerializer,
)

from .models import (
    Case,
    CaseRoute,
    CaseUpdate,
    VictimProfile,
)


User = get_user_model()


class CaseSerializer(serializers.ModelSerializer):
    incident_district = DistrictSerializer(
        read_only=True,
    )
    incident_district_id = serializers.PrimaryKeyRelatedField(
        source="incident_district",
        queryset=District.objects.filter(is_active=True),
        write_only=True,
    )

    reported_by_name = serializers.CharField(
        source="reported_by.full_name",
        read_only=True,
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.full_name",
        read_only=True,
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.filter(is_active=True),
        allow_null=True,
        required=False,
        write_only=True,
    )

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    confidentiality_display = serializers.CharField(
        source="get_confidentiality_display",
        read_only=True,
    )

    class Meta:
        model = Case
        fields = (
            "id",
            "reference_code",
            "title",
            "summary",
            "category",
            "category_display",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "confidentiality",
            "confidentiality_display",
            "incident_district",
            "incident_district_id",
            "location_description",
            "latitude",
            "longitude",
            "incident_date",
            "total_victims",
            "minor_victims",
            "is_verified",
            "reported_by_name",
            "assigned_to_id",
            "assigned_to_name",
            "reported_at",
            "updated_at",
            "resolved_at",
        )
        read_only_fields = (
            "id",
            "reference_code",
            "reported_by_name",
            "reported_at",
            "updated_at",
            "resolved_at",
        )

    def validate(self, attrs):
        instance = self.instance
        request = self.context.get("request")

        total_victims = attrs.get(
            "total_victims",
            getattr(instance, "total_victims", 0),
        )
        minor_victims = attrs.get(
            "minor_victims",
            getattr(instance, "minor_victims", 0),
        )

        if minor_victims > total_victims:
            raise serializers.ValidationError(
                {
                    "minor_victims": (
                        "Minor victim count cannot exceed "
                        "total victim count."
                    )
                }
            )

        latitude = attrs.get(
            "latitude",
            getattr(instance, "latitude", None),
        )
        longitude = attrs.get(
            "longitude",
            getattr(instance, "longitude", None),
        )

        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError(
                {
                    "coordinates": (
                        "Latitude and longitude must either "
                        "both be provided or both be empty."
                    )
                }
            )

        incident_date = attrs.get(
            "incident_date",
            getattr(instance, "incident_date", None),
        )

        if (
            incident_date
            and incident_date > timezone.localdate()
        ):
            raise serializers.ValidationError(
                {
                    "incident_date": (
                        "Incident date cannot be in the future."
                    )
                }
            )

        if (
            request
            and request.method == "POST"
            and not request.user.is_superuser
            and request.user.role == "ngo"
        ):
            if attrs.get("status", Case.Status.REPORTED) != (
                Case.Status.REPORTED
            ):
                raise serializers.ValidationError(
                    {
                        "status": (
                            "NGO users must submit new cases "
                            "with reported status."
                        )
                    }
                )

            if attrs.get("is_verified", False):
                raise serializers.ValidationError(
                    {
                        "is_verified": (
                            "NGO users cannot verify a case."
                        )
                    }
                )

            if attrs.get("assigned_to"):
                raise serializers.ValidationError(
                    {
                        "assigned_to_id": (
                            "NGO users cannot assign a case."
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        case = super().create(validated_data)
        request = self.context.get("request")

        CaseUpdate.objects.create(
            case=case,
            update_type=CaseUpdate.UpdateType.NOTE,
            new_status=case.status,
            note="Case created through the secure API.",
            changed_by=(
                request.user
                if request and request.user.is_authenticated
                else None
            ),
        )

        return case

    def update(self, instance, validated_data):
        previous_status = instance.status
        new_status = validated_data.get(
            "status",
            previous_status,
        )

        if (
            new_status
            in {
                Case.Status.RESOLVED,
                Case.Status.CLOSED,
            }
            and previous_status != new_status
        ):
            validated_data["resolved_at"] = timezone.now()

        if (
            previous_status
            in {
                Case.Status.RESOLVED,
                Case.Status.CLOSED,
            }
            and new_status
            not in {
                Case.Status.RESOLVED,
                Case.Status.CLOSED,
            }
        ):
            validated_data["resolved_at"] = None

        case = super().update(
            instance,
            validated_data,
        )

        if previous_status != new_status:
            request = self.context.get("request")

            CaseUpdate.objects.create(
                case=case,
                update_type=(
                    CaseUpdate.UpdateType.STATUS_CHANGE
                ),
                previous_status=previous_status,
                new_status=new_status,
                note="Status changed through the secure API.",
                changed_by=(
                    request.user
                    if request
                    and request.user.is_authenticated
                    else None
                ),
            )

        return case

class CaseUpdateSerializer(serializers.ModelSerializer):
    case_reference = serializers.CharField(
        source="case.reference_code",
        read_only=True,
    )
    case_id = serializers.PrimaryKeyRelatedField(
        source="case",
        queryset=Case.objects.all(),
        write_only=True,
    )
    changed_by_name = serializers.CharField(
        source="changed_by.full_name",
        read_only=True,
    )
    update_type_display = serializers.CharField(
        source="get_update_type_display",
        read_only=True,
    )

    class Meta:
        model = CaseUpdate
        fields = (
            "id",
            "case_reference",
            "case_id",
            "update_type",
            "update_type_display",
            "previous_status",
            "new_status",
            "note",
            "is_internal",
            "changed_by_name",
            "created_at",
        )
        read_only_fields = (
            "id",
            "previous_status",
            "new_status",
            "changed_by_name",
            "created_at",
        )

    def validate_update_type(self, value):
        if value == CaseUpdate.UpdateType.STATUS_CHANGE:
            raise serializers.ValidationError(
                "Change case status through the Case API."
            )

        return value


class CaseRouteSerializer(serializers.ModelSerializer):
    case_reference = serializers.CharField(
        source="case.reference_code",
        read_only=True,
    )
    case_id = serializers.PrimaryKeyRelatedField(
        source="case",
        queryset=Case.objects.all(),
        write_only=True,
    )

    route = RouteSerializer(
        read_only=True,
    )
    route_id = serializers.PrimaryKeyRelatedField(
        source="route",
        queryset=Route.objects.filter(is_active=True),
        write_only=True,
    )

    linked_by_name = serializers.CharField(
        source="linked_by.full_name",
        read_only=True,
    )
    relationship_type_display = serializers.CharField(
        source="get_relationship_type_display",
        read_only=True,
    )
    confidence_level_display = serializers.CharField(
        source="get_confidence_level_display",
        read_only=True,
    )

    class Meta:
        model = CaseRoute
        fields = (
            "id",
            "case_reference",
            "case_id",
            "route",
            "route_id",
            "relationship_type",
            "relationship_type_display",
            "confidence_level",
            "confidence_level_display",
            "evidence_note",
            "linked_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "linked_by_name",
            "created_at",
            "updated_at",
        )


class VictimProfileSerializer(
    serializers.ModelSerializer,
):
    case_reference = serializers.CharField(
        source="case.reference_code",
        read_only=True,
    )
    case_id = serializers.PrimaryKeyRelatedField(
        source="case",
        queryset=Case.objects.all(),
        write_only=True,
    )

    recorded_by_name = serializers.CharField(
        source="recorded_by.full_name",
        read_only=True,
    )
    age_group_display = serializers.CharField(
        source="get_age_group_display",
        read_only=True,
    )
    gender_display = serializers.CharField(
        source="get_gender_display",
        read_only=True,
    )
    exploitation_type_display = serializers.CharField(
        source="get_exploitation_type_display",
        read_only=True,
    )
    support_status_display = serializers.CharField(
        source="get_support_status_display",
        read_only=True,
    )

    class Meta:
        model = VictimProfile
        fields = (
            "id",
            "anonymous_code",
            "case_reference",
            "case_id",
            "age_group",
            "age_group_display",
            "gender",
            "gender_display",
            "exploitation_type",
            "exploitation_type_display",
            "support_status",
            "support_status_display",
            "country_of_origin",
            "support_needs",
            "protected_note",
            "recorded_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "anonymous_code",
            "recorded_by_name",
            "created_at",
            "updated_at",
        )

    def validate_support_needs(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Support needs must be provided as a list."
            )

        allowed_support_needs = {
            "medical",
            "legal",
            "shelter",
            "counselling",
            "family_support",
            "education",
            "livelihood",
        }

        invalid_values = set(value) - allowed_support_needs

        if invalid_values:
            raise serializers.ValidationError(
                "Unsupported categories: "
                + ", ".join(sorted(invalid_values))
            )

        return value