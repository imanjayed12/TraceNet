from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response

from .emergency_permissions import (
    CanManageEmergencyInvitations,
    CanRevokeEmergencyGrants,
)
from .emergency_serializers import (
    CaseAccessGrantRevokeSerializer,
    CaseAccessGrantSerializer,
    EmergencyAccessInvitationCreateSerializer,
    EmergencyAccessInvitationSerializer,
)
from .models import (
    CaseAccessGrant,
    EmergencyAccessInvitation,
)
from .views import ensure_case_is_visible


class EmergencyInvitationListCreateView(
    generics.ListCreateAPIView,
):
    permission_classes = (
        CanManageEmergencyInvitations,
    )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EmergencyAccessInvitationCreateSerializer

        return EmergencyAccessInvitationSerializer

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

        output_serializer = (
            EmergencyAccessInvitationSerializer(
                input_serializer.instance,
                context=self.get_serializer_context(),
            )
        )

        headers = self.get_success_headers(
            output_serializer.data,
        )

        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def get_queryset(self):
        user = self.request.user

        queryset = (
            EmergencyAccessInvitation.objects.select_related(
                "case",
                "sponsor",
                "accepted_by",
            )
        )

        if not user.is_superuser and user.role != "admin":
            queryset = queryset.filter(
                sponsor=user,
            )

        invitation_status = self.request.query_params.get(
            "status",
        )
        invitee_email = self.request.query_params.get(
            "invitee_email",
        )
        case_reference = self.request.query_params.get(
            "case",
        )

        if invitation_status:
            queryset = queryset.filter(
                status__iexact=invitation_status.strip(),
            )

        if invitee_email:
            queryset = queryset.filter(
                invitee_email__iexact=(
                    invitee_email.strip()
                ),
            )

        if case_reference:
            queryset = queryset.filter(
                case__reference_code__iexact=(
                    case_reference.strip()
                ),
            )

        return queryset

    def perform_create(self, serializer):
        case = serializer.validated_data["case"]

        ensure_case_is_visible(
            self.request.user,
            case,
        )

        serializer.save()


class EmergencyInvitationDetailView(
    generics.RetrieveAPIView,
):
    serializer_class = EmergencyAccessInvitationSerializer
    permission_classes = (
        CanManageEmergencyInvitations,
    )
    lookup_field = "token"

    def get_queryset(self):
        user = self.request.user

        queryset = (
            EmergencyAccessInvitation.objects.select_related(
                "case",
                "sponsor",
                "accepted_by",
            )
        )

        if user.is_superuser or user.role == "admin":
            return queryset

        return queryset.filter(
            sponsor=user,
        )


class EmergencyInvitationRevokeView(
    generics.GenericAPIView,
):
    serializer_class = EmergencyAccessInvitationSerializer
    permission_classes = (
        CanManageEmergencyInvitations,
    )
    lookup_field = "token"

    def get_queryset(self):
        user = self.request.user

        queryset = EmergencyAccessInvitation.objects.select_related(
            "case",
            "sponsor",
            "accepted_by",
        )

        if user.is_superuser or user.role == "admin":
            return queryset

        return queryset.filter(
            sponsor=user,
        )

    def post(self, request, *args, **kwargs):
        invitation = self.get_object()

        if (
            invitation.status
            != EmergencyAccessInvitation.Status.PENDING
        ):
            return Response(
                {
                    "detail": (
                        "Only pending invitations can be revoked."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = (
            EmergencyAccessInvitation.Status.REVOKED
        )
        invitation.revoked_at = timezone.now()
        invitation.save(
            update_fields=(
                "status",
                "revoked_at",
            )
        )

        return Response(
            {
                "detail": (
                    "Emergency invitation revoked successfully."
                ),
                "invitation": (
                    EmergencyAccessInvitationSerializer(
                        invitation,
                    ).data
                ),
            },
            status=status.HTTP_200_OK,
        )
class EmergencyAccessGrantRevokeView(
    generics.GenericAPIView,
):
    serializer_class = CaseAccessGrantRevokeSerializer
    permission_classes = (
        CanRevokeEmergencyGrants,
    )
    lookup_field = "pk"

    def get_queryset(self):
        return CaseAccessGrant.objects.select_related(
            "case",
            "user",
            "invitation",
            "granted_by",
            "revoked_by",
        )

    def post(self, request, *args, **kwargs):
        grant = self.get_object()

        if not grant.is_active:
            return Response(
                {
                    "detail": (
                        "This emergency access grant "
                        "is already inactive."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        grant.is_active = False
        grant.revoked_by = request.user
        grant.revoked_at = timezone.now()
        grant.revocation_reason = (
            serializer.validated_data["reason"]
        )
        grant.save(
            update_fields=(
                "is_active",
                "revoked_by",
                "revoked_at",
                "revocation_reason",
            )
        )

        emergency_user = grant.user

        has_other_valid_grants = (
            CaseAccessGrant.objects.filter(
                user=emergency_user,
                is_active=True,
                expires_at__gt=timezone.now(),
            ).exclude(
                pk=grant.pk,
            ).exists()
        )

        if (
            emergency_user.access_status == "emergency"
            and not has_other_valid_grants
        ):
            emergency_user.is_active = False
            emergency_user.save(
                update_fields=(
                    "is_active",
                )
            )

        return Response(
            {
                "detail": (
                    "Emergency access revoked successfully."
                ),
                "grant": CaseAccessGrantSerializer(
                    grant,
                ).data,
                "emergency_user_active": (
                    emergency_user.is_active
                ),
            },
            status=status.HTTP_200_OK,
        )