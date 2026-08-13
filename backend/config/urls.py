from django.contrib import admin
from django.urls import include, path

from .health import health_check


urlpatterns = [
    path(
        "api/health/",
        health_check,
        name="health-check",
    ),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/locations/", include("locations.urls")),
    path("api/cases/", include("cases.urls")),
    path("api/alerts/", include("alerts.urls")),
    path("api/audit/", include("audit.urls")),
    path("api/reports/", include("reports.urls")),
]
