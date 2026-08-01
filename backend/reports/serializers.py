from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(
        source="get_report_type_display",
        read_only=True,
    )
    output_format_display = serializers.CharField(
        source="get_output_format_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    generated_by_name = serializers.CharField(
        source="generated_by.full_name",
        read_only=True,
        default="",
    )
    generated_by_email = serializers.EmailField(
        source="generated_by.email",
        read_only=True,
        default="",
    )

    class Meta:
        model = Report
        fields = (
            "id",
            "title",
            "report_type",
            "report_type_display",
            "output_format",
            "output_format_display",
            "status",
            "status_display",
            "date_from",
            "date_to",
            "filters",
            "summary",
            "generated_by_name",
            "generated_by_email",
            "error_message",
            "generated_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "status_display",
            "summary",
            "generated_by_name",
            "generated_by_email",
            "error_message",
            "generated_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        date_from = attrs.get(
            "date_from",
            getattr(self.instance, "date_from", None),
        )
        date_to = attrs.get(
            "date_to",
            getattr(self.instance, "date_to", None),
        )

        if (
            date_from
            and date_to
            and date_from > date_to
        ):
            raise serializers.ValidationError(
                {
                    "date_to": (
                        "The end date cannot be earlier "
                        "than the start date."
                    )
                }
            )

        return attrs