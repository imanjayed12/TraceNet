from django.urls import path

from .views import (
    CaseDetailView,
    CaseListCreateView,
    CaseRouteDetailView,
    CaseRouteListCreateView,
    CaseUpdateListCreateView,
    VictimProfileDetailView,
    VictimProfileListCreateView,
)


app_name = "cases"

urlpatterns = [
    path(
        "",
        CaseListCreateView.as_view(),
        name="case-list",
    ),
    path(
        "updates/",
        CaseUpdateListCreateView.as_view(),
        name="case-update-list",
    ),
    path(
        "route-links/",
        CaseRouteListCreateView.as_view(),
        name="case-route-list",
    ),
    path(
        "route-links/<int:pk>/",
        CaseRouteDetailView.as_view(),
        name="case-route-detail",
    ),
    path(
        "victims/",
        VictimProfileListCreateView.as_view(),
        name="victim-list",
    ),
    path(
        "victims/<str:anonymous_code>/",
        VictimProfileDetailView.as_view(),
        name="victim-detail",
    ),
    path(
        "<str:reference_code>/",
        CaseDetailView.as_view(),
        name="case-detail",
    ),
]