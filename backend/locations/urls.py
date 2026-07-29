from django.urls import path

from .views import (
    DistrictDetailView,
    DistrictListView,
    RouteDetailView,
    RouteListCreateView,
)


app_name = "locations"

urlpatterns = [
    path(
        "districts/",
        DistrictListView.as_view(),
        name="district-list",
    ),
    path(
        "districts/<slug:slug>/",
        DistrictDetailView.as_view(),
        name="district-detail",
    ),
    path(
        "routes/",
        RouteListCreateView.as_view(),
        name="route-list",
    ),
    path(
        "routes/<int:pk>/",
        RouteDetailView.as_view(),
        name="route-detail",
    ),
]