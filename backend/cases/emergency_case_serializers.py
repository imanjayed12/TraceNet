from rest_framework import serializers

from locations.serializers import DistrictSerializer

from .models import Case


class EmergencyCaseSerializer(serializers.ModelSerializer):
    incident_district = DistrictSerializer(
        read_only=True,
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

    class Meta:
        model = Case
        fields = (
            "reference_code",
            "title",
            "category",
            "category_display",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "incident_district",
            "incident_date",
            "is_verified",
            "updated_at",
        )
        read_only_fields = fields