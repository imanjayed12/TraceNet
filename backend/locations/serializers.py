from django.utils import timezone
from rest_framework import serializers

from .models import District, Hotspot, Route
from .risk_scoring import calculate_hotspot_risk

def enforce_admin_workflow_fields(
    serializer,
    attrs,
):
    request = serializer.context.get("request")
    user = getattr(request, "user", None)

    is_admin = bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or user.role == "admin"
        )
    )

    if is_admin:
        return attrs

    if serializer.instance is None:
        attrs["is_verified"] = False
        attrs["is_active"] = True
        return attrs

    errors = {}

    if "is_verified" in attrs:
        errors["is_verified"] = (
            "Only an administrator can change "
            "route or hotspot verification."
        )

    if "is_active" in attrs:
        errors["is_active"] = (
            "Only an administrator can change "
            "route or hotspot activity."
        )

    if errors:
        raise serializers.ValidationError(errors)

    return attrs

class DistrictSerializer(serializers.ModelSerializer):
    division_display = serializers.CharField(
        source="get_division_display",
        read_only=True,
    )

    class Meta:
        model = District
        fields = (
            "id",
            "name",
            "slug",
            "division",
            "division_display",
            "latitude",
            "longitude",
        )
        read_only_fields = fields


class RouteSerializer(serializers.ModelSerializer):
    origin = DistrictSerializer(
        read_only=True,
    )
    destination = DistrictSerializer(
        read_only=True,
    )

    origin_id = serializers.PrimaryKeyRelatedField(
        source="origin",
        queryset=District.objects.filter(is_active=True),
        write_only=True,
    )
    destination_id = serializers.PrimaryKeyRelatedField(
        source="destination",
        queryset=District.objects.filter(is_active=True),
        write_only=True,
    )

    route_type_display = serializers.CharField(
        source="get_route_type_display",
        read_only=True,
    )
    transport_mode_display = serializers.CharField(
        source="get_transport_mode_display",
        read_only=True,
    )
    risk_level_display = serializers.CharField(
        source="get_risk_level_display",
        read_only=True,
    )
    created_by_name = serializers.CharField(
        source="created_by.full_name",
        read_only=True,
    )

    class Meta:
        model = Route
        fields = (
            "id",
            "name",
            "origin",
            "origin_id",
            "destination",
            "destination_id",
            "route_type",
            "route_type_display",
            "transport_mode",
            "transport_mode_display",
            "risk_level",
            "risk_level_display",
            "description",
            "evidence_summary",
            "is_verified",
            "is_active",
            "created_by_id",
            "created_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by_id",
            "created_by_name",
            "created_at",
            "updated_at",
        )


    def validate(self, attrs):
        attrs = enforce_admin_workflow_fields(
            self,
            attrs,
        )

        origin = attrs.get(
            "origin",
            getattr(
                self.instance,
                "origin",
                None,
            ),
        )
        destination = attrs.get(
            "destination",
            getattr(
                self.instance,
                "destination",
                None,
            ),
        )

        if (
            origin
            and destination
            and origin == destination
        ):
            raise serializers.ValidationError(
                {
                    "destination_id": (
                        "Origin and destination must be "
                        "different districts."
                    )
                }
            )

        return attrs


class HotspotSerializer(serializers.ModelSerializer):
    district = DistrictSerializer(
        read_only=True,
    )

    district_id = serializers.PrimaryKeyRelatedField(
        source="district",
        queryset=District.objects.filter(is_active=True),
        write_only=True,
    )

    hotspot_type_display = serializers.CharField(
        source="get_hotspot_type_display",
        read_only=True,
    )
    risk_level_display = serializers.CharField(
        source="get_risk_level_display",
        read_only=True,
    )
    created_by_name = serializers.CharField(
        source="created_by.full_name",
        read_only=True,
    )
    created_by_id = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = Hotspot
        fields = (
            "id",
            "name",
            "district",
            "district_id",
            "latitude",
            "longitude",
            "hotspot_type",
            "hotspot_type_display",
            "recent_case_count",
            "active_route_count",
            "verified_route_count",
            "vulnerability_score",
            "risk_score",
            "risk_level",
            "risk_level_display",
            "risk_factors",
            "risk_explanation",
            "last_assessed_at",
            "is_verified",
            "is_active",
            "created_by_id",
            "created_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "risk_score",
            "risk_level",
            "risk_level_display",
            "risk_factors",
            "risk_explanation",
            "last_assessed_at",
            "created_by_id",
            "created_by_name",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        attrs = enforce_admin_workflow_fields(
            self,
            attrs,
        )

        active_route_count = attrs.get(
            "active_route_count",
            getattr(
                self.instance,
                "active_route_count",
                0,
            ),
        )
        verified_route_count = attrs.get(
            "verified_route_count",
            getattr(
                self.instance,
                "verified_route_count",
                0,
            ),
        )

        if verified_route_count > active_route_count:
            raise serializers.ValidationError(
                {
                    "verified_route_count": (
                        "Verified route count cannot exceed "
                        "active route count."
                    )
                }
            )

        return attrs

    def _add_risk_assessment(self, validated_data):
        instance = self.instance

        recent_case_count = validated_data.get(
            "recent_case_count",
            getattr(
                instance,
                "recent_case_count",
                0,
            ),
        )
        active_route_count = validated_data.get(
            "active_route_count",
            getattr(
                instance,
                "active_route_count",
                0,
            ),
        )
        verified_route_count = validated_data.get(
            "verified_route_count",
            getattr(
                instance,
                "verified_route_count",
                0,
            ),
        )
        vulnerability_score = validated_data.get(
            "vulnerability_score",
            getattr(
                instance,
                "vulnerability_score",
                0,
            ),
        )

        assessment = calculate_hotspot_risk(
            recent_case_count=recent_case_count,
            active_route_count=active_route_count,
            verified_route_count=verified_route_count,
            vulnerability_score=vulnerability_score,
        )

        validated_data.update(
            assessment,
            last_assessed_at=timezone.now(),
        )

        return validated_data

    def create(self, validated_data):
        validated_data = self._add_risk_assessment(
            validated_data,
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._add_risk_assessment(
            validated_data,
        )
        return super().update(
            instance,
            validated_data,
        )