from rest_framework import serializers

from .models import District


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