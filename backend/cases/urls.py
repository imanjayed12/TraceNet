from django.urls import path

from .emergency_registration_views import (
    EmergencyInvitationAcceptView,
)
from .emergency_views import (
    EmergencyAccessGrantRevokeView,
    EmergencyInvitationDetailView,
    EmergencyInvitationListCreateView,
    EmergencyInvitationRevokeView,
)
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
        "emergency-access/accept/",
        EmergencyInvitationAcceptView.as_view(),
        name="emergency-access-accept",
    ),
        path(
        "emergency-grants/<int:pk>/revoke/",
        EmergencyAccessGrantRevokeView.as_view(),
        name="emergency-grant-revoke",
    ),
    path(
        "emergency-invitations/",
        EmergencyInvitationListCreateView.as_view(),
        name="emergency-invitation-list",
    ),
    path(
        "emergency-invitations/<uuid:token>/",
        EmergencyInvitationDetailView.as_view(),
        name="emergency-invitation-detail",
    ),
    path(
        "emergency-invitations/<uuid:token>/revoke/",
        EmergencyInvitationRevokeView.as_view(),
        name="emergency-invitation-revoke",
    ),
    path(
        "<str:reference_code>/",
        CaseDetailView.as_view(),
        name="case-detail",
    ),
]