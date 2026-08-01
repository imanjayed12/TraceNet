from django.db.models import Q
from django.http import HttpResponse
from rest_framework import generics
from rest_framework.exceptions import ValidationError

from .exporters import build_report_export
from .models import Report
from .permissions import CanManageReports
from .serializers import ReportSerializer
from .services import generate_report


def reports_visible_to(user):
    queryset = Report.objects.select_related(
        "generated_by",
    )

    if user.is_superuser or user.role == "admin":
        return queryset

    return queryset.filter(
        generated_by=user,
    )


class ReportListCreateView(
    generics.ListCreateAPIView,
):
    serializer_class = ReportSerializer
    permission_classes = (CanManageReports,)

    def get_queryset(self):
        queryset = reports_visible_to(
            self.request.user,
        )

        report_type = self.request.query_params.get(
            "report_type",
        )
        status_value = self.request.query_params.get(
            "status",
        )
        output_format = self.request.query_params.get(
            "output_format",
        )
        search = self.request.query_params.get(
            "search",
        )

        if report_type:
            queryset = queryset.filter(
                report_type__iexact=(
                    report_type.strip()
                ),
            )

        if status_value:
            queryset = queryset.filter(
                status__iexact=status_value.strip(),
            )

        if output_format:
            queryset = queryset.filter(
                output_format__iexact=(
                    output_format.strip()
                ),
            )

        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(
                    generated_by__email__icontains=search
                )
                | Q(
                    generated_by__full_name__icontains=search
                )
            )

        return queryset

    def perform_create(self, serializer):
        report = serializer.save(
            generated_by=self.request.user,
        )
        generate_report(report)


class ReportDetailView(
    generics.RetrieveAPIView,
):
    serializer_class = ReportSerializer
    permission_classes = (CanManageReports,)

    def get_queryset(self):
        return reports_visible_to(
            self.request.user,
        )


class ReportDownloadView(
    generics.RetrieveAPIView,
):
    serializer_class = ReportSerializer
    permission_classes = (CanManageReports,)

    def get_queryset(self):
        return reports_visible_to(
            self.request.user,
        )

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()

        if report.status != Report.Status.COMPLETED:
            raise ValidationError(
                {
                    "detail": (
                        "Only completed reports can "
                        "be downloaded."
                    )
                }
            )

        content, content_type, filename = (
            build_report_export(report)
        )

        response = HttpResponse(
            content,
            content_type=content_type,
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )
        response["X-Content-Type-Options"] = "nosniff"

        return response