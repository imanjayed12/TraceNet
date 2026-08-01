from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(
        source="get_action_display",
        read_only=True,
    )
    actor_name = serializers.CharField(
        source="actor.full_name",
        read_only=True,
        default="",
    )

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "created_at",
            "actor_email",
            "actor_name",
            "action",
            "action_display",
            "resource_type",
            "resource_id",
            "resource_label",
            "request_method",
            "request_path",
            "ip_address",
            "status_code",
            "success",
            "metadata",
        )
        read_only_fields = fields