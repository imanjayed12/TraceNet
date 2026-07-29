from rest_framework import serializers

from .models import District, Route


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
    origin = DistrictSerializer(read_only=True)
    destination = DistrictSerializer(read_only=True)

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
            "created_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by_name",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        origin = attrs.get(
            "origin",
            getattr(self.instance, "origin", None),
        )
        destination = attrs.get(
            "destination",
            getattr(self.instance, "destination", None),
        )

        if origin and destination and origin == destination:
            raise serializers.ValidationError(
                {
                    "destination_id": (
                        "Origin and destination must be different districts."
                    )
                }
            )

        return attrs