from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from cases.models import Case
from locations.models import Hotspot, Route

from .models import (
    Alert,
    AlertRecipient,
)
from .services import create_alert_with_recipients


User = get_user_model()


class AlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(
        source="get_alert_type_display",
        read_only=True,
    )
    severity_display = serializers.CharField(
        source="get_severity_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    case_reference = serializers.CharField(
        source="case.reference_code",
        read_only=True,
        allow_null=True,
    )
    hotspot_name = serializers.CharField(
        source="hotspot.name",
        read_only=True,
        allow_null=True,
    )
    route_name = serializers.CharField(
        source="route.name",
        read_only=True,
        allow_null=True,
    )
    created_by_name = serializers.CharField(
        source="created_by.full_name",
        read_only=True,
        allow_null=True,
    )
    recipient_count = serializers.IntegerField(
        source="recipient_records.count",
        read_only=True,
    )

    class Meta:
        model = Alert
        fields = (
            "id",
            "alert_type",
            "alert_type_display",
            "severity",
            "severity_display",
            "status",
            "status_display",
            "title",
            "message",
            "case_reference",
            "hotspot_name",
            "route_name",
            "target_roles",
            "created_by_name",
            "recipient_count",
            "expires_at",
            "resolved_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AlertCreateSerializer(serializers.Serializer):
    alert_type = serializers.ChoiceField(
        choices=Alert.AlertType.choices,
    )
    severity = serializers.ChoiceField(
        choices=Alert.Severity.choices,
    )
    title = serializers.CharField(
        max_length=180,
        min_length=5,
    )
    message = serializers.CharField(
        min_length=10,
    )

    case_reference = serializers.SlugRelatedField(
        source="case",
        slug_field="reference_code",
        queryset=Case.objects.all(),
        required=False,
        allow_null=True,
    )
    hotspot_id = serializers.PrimaryKeyRelatedField(
        source="hotspot",
        queryset=Hotspot.objects.filter(
            is_active=True,
        ),
        required=False,
        allow_null=True,
    )
    route_id = serializers.PrimaryKeyRelatedField(
        source="route",
        queryset=Route.objects.filter(
            is_active=True,
        ),
        required=False,
        allow_null=True,
    )

    target_roles = serializers.ListField(
        child=serializers.ChoiceField(
            choices=User.Role.choices,
        ),
        required=False,
        allow_empty=True,
        default=list,
    )
    recipient_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_active=True,
            access_status=User.AccessStatus.APPROVED,
        ),
        many=True,
        required=False,
        write_only=True,
    )
    expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    def validate_title(self, value):
        return value.strip()

    def validate_message(self, value):
        return value.strip()

    def validate_expires_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError(
                "Expiry time must be in the future."
            )

        return value

    def validate(self, attrs):
        alert_type = attrs["alert_type"]
        case = attrs.get("case")
        hotspot = attrs.get("hotspot")
        route = attrs.get("route")
        target_roles = attrs.get("target_roles", [])
        recipients = attrs.get("recipient_ids", [])

        selected_sources = sum(
            source is not None
            for source in (
                case,
                hotspot,
                route,
            )
        )

        if selected_sources > 1:
            raise serializers.ValidationError(
                "An alert can reference only one primary source."
            )

        required_source = {
            Alert.AlertType.CASE: (
                "case",
                case,
            ),
            Alert.AlertType.HOTSPOT: (
                "hotspot",
                hotspot,
            ),
            Alert.AlertType.ROUTE: (
                "route",
                route,
            ),
        }.get(alert_type)

        if required_source:
            field_name, source_value = required_source

            if source_value is None:
                raise serializers.ValidationError(
                    {
                        field_name: (
                            f"A {field_name} is required "
                            f"for this alert type."
                        )
                    }
                )

        if not target_roles and not recipients:
            raise serializers.ValidationError(
                {
                    "target_roles": (
                        "Select at least one target role "
                        "or explicit recipient."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        explicit_users = validated_data.pop(
            "recipient_ids",
            [],
        )
        request = self.context["request"]

        return create_alert_with_recipients(
            created_by=request.user,
            explicit_users=explicit_users,
            **validated_data,
        )


class AlertManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = (
            "severity",
            "status",
            "title",
            "message",
            "expires_at",
        )

    def validate_expires_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError(
                "Expiry time must be in the future."
            )

        return value


class AlertRecipientSerializer(
    serializers.ModelSerializer,
):
    alert_id = serializers.IntegerField(
        source="alert.id",
        read_only=True,
    )
    alert_type = serializers.CharField(
        source="alert.alert_type",
        read_only=True,
    )
    severity = serializers.CharField(
        source="alert.severity",
        read_only=True,
    )
    title = serializers.CharField(
        source="alert.title",
        read_only=True,
    )
    message = serializers.CharField(
        source="alert.message",
        read_only=True,
    )
    case_reference = serializers.CharField(
        source="alert.case.reference_code",
        read_only=True,
        allow_null=True,
    )
    hotspot_name = serializers.CharField(
        source="alert.hotspot.name",
        read_only=True,
        allow_null=True,
    )
    route_name = serializers.CharField(
        source="alert.route.name",
        read_only=True,
        allow_null=True,
    )
    expires_at = serializers.DateTimeField(
        source="alert.expires_at",
        read_only=True,
        allow_null=True,
    )
    alert_created_at = serializers.DateTimeField(
        source="alert.created_at",
        read_only=True,
    )

    class Meta:
        model = AlertRecipient
        fields = (
            "id",
            "alert_id",
            "alert_type",
            "severity",
            "title",
            "message",
            "case_reference",
            "hotspot_name",
            "route_name",
            "delivery_status",
            "is_read",
            "read_at",
            "is_acknowledged",
            "acknowledged_at",
            "expires_at",
            "alert_created_at",
        )
        read_only_fields = fields