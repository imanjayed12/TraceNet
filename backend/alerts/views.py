from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response

from .models import (
    Alert,
    AlertRecipient,
)
from .permissions import (
    CanManageAlerts,
    IsAlertRecipient,
)
from .serializers import (
    AlertCreateSerializer,
    AlertManageSerializer,
    AlertRecipientSerializer,
    AlertSerializer,
)


def visible_alerts_for(user):
    queryset = Alert.objects.select_related(
        "case",
        "hotspot",
        "route",
        "created_by",
        "resolved_by",
    )

    if user.is_superuser or user.role == "admin":
        return queryset

    return queryset.filter(
        Q(created_by=user)
        | Q(recipient_records__user=user)
    ).distinct()


class AlertListCreateView(
    generics.ListCreateAPIView,
):
    permission_classes = (
        CanManageAlerts,
    )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AlertCreateSerializer

        return AlertSerializer

    def get_queryset(self):
        queryset = visible_alerts_for(
            self.request.user,
        )

        alert_type = self.request.query_params.get(
            "alert_type",
        )
        severity = self.request.query_params.get(
            "severity",
        )
        alert_status = self.request.query_params.get(
            "status",
        )
        search = self.request.query_params.get(
            "search",
        )

        if alert_type:
            queryset = queryset.filter(
                alert_type__iexact=alert_type.strip(),
            )

        if severity:
            queryset = queryset.filter(
                severity__iexact=severity.strip(),
            )

        if alert_status:
            queryset = queryset.filter(
                status__iexact=alert_status.strip(),
            )

        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(message__icontains=search)
                | Q(
                    case__reference_code__icontains=search
                )
                | Q(hotspot__name__icontains=search)
                | Q(route__name__icontains=search)
            )

        return queryset

    def create(self, request, *args, **kwargs):
        input_serializer = self.get_serializer(
            data=request.data,
        )
        input_serializer.is_valid(
            raise_exception=True,
        )
        self.perform_create(
            input_serializer,
        )

        output_serializer = AlertSerializer(
            input_serializer.instance,
            context=self.get_serializer_context(),
        )

        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class AlertDetailView(
    generics.RetrieveUpdateDestroyAPIView,
):
    permission_classes = (
        CanManageAlerts,
    )

    def get_serializer_class(self):
        if self.request.method in {
            "GET",
            "HEAD",
            "OPTIONS",
        }:
            return AlertSerializer

        return AlertManageSerializer

    def get_queryset(self):
        return visible_alerts_for(
            self.request.user,
        )

    def perform_update(self, serializer):
        alert = serializer.instance
        new_status = serializer.validated_data.get(
            "status",
            alert.status,
        )

        if new_status == Alert.Status.RESOLVED:
            serializer.save(
                resolved_by=self.request.user,
                resolved_at=timezone.now(),
            )
        else:
            serializer.save(
                resolved_by=None,
                resolved_at=None,
            )


class AlertInboxView(generics.ListAPIView):
    serializer_class = AlertRecipientSerializer
    permission_classes = (
        IsAlertRecipient,
    )

    def get_queryset(self):
        queryset = AlertRecipient.objects.filter(
            user=self.request.user,
            alert__status=Alert.Status.ACTIVE,
        ).filter(
            Q(alert__expires_at__isnull=True)
            | Q(alert__expires_at__gt=timezone.now())
        ).select_related(
            "alert",
            "alert__case",
            "alert__hotspot",
            "alert__route",
        )

        is_read = self.request.query_params.get(
            "is_read",
        )
        is_acknowledged = self.request.query_params.get(
            "is_acknowledged",
        )
        severity = self.request.query_params.get(
            "severity",
        )

        if is_read in {
            "true",
            "false",
        }:
            queryset = queryset.filter(
                is_read=is_read == "true",
            )

        if is_acknowledged in {
            "true",
            "false",
        }:
            queryset = queryset.filter(
                is_acknowledged=(
                    is_acknowledged == "true"
                ),
            )

        if severity:
            queryset = queryset.filter(
                alert__severity__iexact=(
                    severity.strip()
                ),
            )

        return queryset


class AlertMarkReadView(generics.GenericAPIView):
    serializer_class = AlertRecipientSerializer
    permission_classes = (
        IsAlertRecipient,
    )

    def get_queryset(self):
        return AlertRecipient.objects.filter(
            user=self.request.user,
        ).select_related(
            "alert",
            "alert__case",
            "alert__hotspot",
            "alert__route",
        )

    def post(self, request, *args, **kwargs):
        recipient = self.get_object()

        if not recipient.is_read:
            recipient.is_read = True
            recipient.read_at = timezone.now()
            recipient.save(
                update_fields=(
                    "is_read",
                    "read_at",
                )
            )

        return Response(
            {
                "detail": "Alert marked as read.",
                "alert": AlertRecipientSerializer(
                    recipient,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class AlertAcknowledgeView(
    generics.GenericAPIView,
):
    serializer_class = AlertRecipientSerializer
    permission_classes = (
        IsAlertRecipient,
    )

    def get_queryset(self):
        return AlertRecipient.objects.filter(
            user=self.request.user,
        ).select_related(
            "alert",
            "alert__case",
            "alert__hotspot",
            "alert__route",
        )

    def post(self, request, *args, **kwargs):
        recipient = self.get_object()
        now = timezone.now()

        recipient.is_read = True
        recipient.read_at = recipient.read_at or now
        recipient.is_acknowledged = True
        recipient.acknowledged_at = (
            recipient.acknowledged_at or now
        )
        recipient.save(
            update_fields=(
                "is_read",
                "read_at",
                "is_acknowledged",
                "acknowledged_at",
            )
        )

        return Response(
            {
                "detail": (
                    "Alert acknowledged successfully."
                ),
                "alert": AlertRecipientSerializer(
                    recipient,
                ).data,
            },
            status=status.HTTP_200_OK,
        )