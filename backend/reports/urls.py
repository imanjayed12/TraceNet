from django.urls import path

from .views import (
    ReportDetailView,
    ReportDownloadView,
    ReportListCreateView,
)


app_name = "reports"

urlpatterns = [
    path(
        "",
        ReportListCreateView.as_view(),
        name="report-list",
    ),
    path(
        "<int:pk>/download/",
        ReportDownloadView.as_view(),
        name="report-download",
    ),
    path(
        "<int:pk>/",
        ReportDetailView.as_view(),
        name="report-detail",
    ),
]