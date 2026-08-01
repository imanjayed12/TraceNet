from django.urls import path

from .views import (
    AlertAcknowledgeView,
    AlertDetailView,
    AlertInboxView,
    AlertListCreateView,
    AlertMarkReadView,
)


app_name = "alerts"

urlpatterns = [
    path(
        "",
        AlertListCreateView.as_view(),
        name="alert-list",
    ),
    path(
        "inbox/",
        AlertInboxView.as_view(),
        name="alert-inbox",
    ),
    path(
        "inbox/<int:pk>/read/",
        AlertMarkReadView.as_view(),
        name="alert-mark-read",
    ),
    path(
        "inbox/<int:pk>/acknowledge/",
        AlertAcknowledgeView.as_view(),
        name="alert-acknowledge",
    ),
    path(
        "<int:pk>/",
        AlertDetailView.as_view(),
        name="alert-detail",
    ),
]