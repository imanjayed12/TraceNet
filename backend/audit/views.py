from django.db.models import Q
from rest_framework import generics

from .models import AuditLog
from .permissions import CanViewAuditLogs
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = (CanViewAuditLogs,)

    def get_queryset(self):
        queryset = AuditLog.objects.select_related(
            "actor",
        ).all()

        action = self.request.query_params.get(
            "action",
        )
        resource_type = self.request.query_params.get(
            "resource_type",
        )
        actor_email = self.request.query_params.get(
            "actor_email",
        )
        success = self.request.query_params.get(
            "success",
        )
        search = self.request.query_params.get(
            "search",
        )
        date_from = self.request.query_params.get(
            "date_from",
        )
        date_to = self.request.query_params.get(
            "date_to",
        )

        if action:
            queryset = queryset.filter(
                action__iexact=action.strip(),
            )

        if resource_type:
            queryset = queryset.filter(
                resource_type__iexact=(
                    resource_type.strip()
                ),
            )

        if actor_email:
            queryset = queryset.filter(
                actor_email__icontains=(
                    actor_email.strip()
                ),
            )

        if success in {"true", "false"}:
            queryset = queryset.filter(
                success=success == "true",
            )

        if date_from:
            queryset = queryset.filter(
                created_at__date__gte=date_from,
            )

        if date_to:
            queryset = queryset.filter(
                created_at__date__lte=date_to,
            )

        if search:
            search = search.strip()

            queryset = queryset.filter(
                Q(actor_email__icontains=search)
                | Q(resource_type__icontains=search)
                | Q(resource_id__icontains=search)
                | Q(resource_label__icontains=search)
                | Q(request_path__icontains=search)
            )

        return queryset