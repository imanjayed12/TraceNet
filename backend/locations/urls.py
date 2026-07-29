from django.urls import path

from .views import DistrictDetailView, DistrictListView


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
]