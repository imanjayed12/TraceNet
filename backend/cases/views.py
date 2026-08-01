from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied

from .models import (
    Case,
    CaseAccessGrant,
    CaseRoute,
    CaseUpdate,
    VictimProfile,
)
from .emergency_case_serializers import EmergencyCaseSerializer
from .permissions import (
    CanManageCaseRoutes,
    CanManageCases,
    CanManageCaseUpdates,
    CanManageVictimProfiles,
)
from .serializers import (
    CaseRouteSerializer,
    CaseSerializer,
    CaseUpdateSerializer,
    VictimProfileSerializer,
)


def visible_cases_for(user):
    queryset = Case.objects.all()

    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser:
        return queryset

    if not user.is_active:
        return queryset.none()

    access_status = getattr(
        user,
        "access_status",
        None,
    )

    if access_status == "emergency":
        now = timezone.now()

        return queryset.filter(
            access_grants__user=user,
            access_grants__is_active=True,
            access_grants__expires_at__gt=now,
        ).distinct()

    if access_status != "approved":
        return queryset.none()

    if user.role in {
        "admin",
        "police",
        "government",
    }:
        return queryset

    if user.role == "analyst":
        return queryset.exclude(
            confidentiality=(
                Case.Confidentiality.HIGHLY_RESTRICTED
            )
        )

    if user.role == "ngo":
        return queryset.filter(
            Q(reported_by=user)
            | Q(assigned_to=user)
        )

    return queryset.none()


def ensure_case_is_visible(user, case):
    if not visible_cases_for(user).filter(pk=case.pk).exists():
        raise PermissionDenied(
            "You do not have access to this case."
        )


class CaseListCreateView(generics.ListCreateAPIView):
    serializer_class = CaseSerializer
    permission_classes = (CanManageCases,)
    def get_serializer_class(self):
        user = self.request.user

        if (
            user.is_authenticated
            and getattr(user, "access_status", None)
            == "emergency"
        ):
            return EmergencyCaseSerializer

        return CaseSerializer

    def get_queryset(self):
        queryset = visible_cases_for(
            self.request.user,
        ).select_related(
            "incident_district",
            "reported_by",
            "assigned_to",
        )

        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        category = self.request.query_params.get("category")
        district = self.request.query_params.get("district")
        is_verified = self.request.query_params.get(
            "is_verified",
        )
        assigned_to = self.request.query_params.get(
            "assigned_to",
        )
        search = self.request.query_params.get("search")

        if status:
            queryset = queryset.filter(
                status__iexact=status.strip(),
            )

        if priority:
            queryset = queryset.filter(
                priority__iexact=priority.strip(),
            )

        if category:
            queryset = queryset.filter(
                category__iexact=category.strip(),
            )

        if district:
            queryset = queryset.filter(
                incident_district__slug__iexact=(
                    district.strip()
                ),
            )

        if is_verified in {"true", "false"}:
            queryset = queryset.filter(
                is_verified=is_verified == "true",
            )

        if assigned_to:
            queryset = queryset.filter(
                assigned_to_id=assigned_to,
            )

        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(reference_code__icontains=search)
                | Q(title__icontains=search)
                | Q(summary__icontains=search)
                | Q(
                    incident_district__name__icontains=search
                )
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            reported_by=self.request.user,
        )


class CaseDetailView(
    generics.RetrieveUpdateDestroyAPIView,
):
    serializer_class = CaseSerializer
    permission_classes = (CanManageCases,)
    lookup_field = "reference_code"
    def get_serializer_class(self):
        user = self.request.user

        if (
            user.is_authenticated
            and getattr(user, "access_status", None)
            == "emergency"
        ):
            return EmergencyCaseSerializer

        return CaseSerializer

    def get_queryset(self):
        return visible_cases_for(
            self.request.user,
        ).select_related(
            "incident_district",
            "reported_by",
            "assigned_to",
        )


class CaseUpdateListCreateView(
    generics.ListCreateAPIView,
):
    serializer_class = CaseUpdateSerializer
    permission_classes = (CanManageCaseUpdates,)

    def get_queryset(self):
        queryset = CaseUpdate.objects.filter(
            case__in=visible_cases_for(self.request.user),
        ).select_related(
            "case",
            "changed_by",
        )

        case_reference = self.request.query_params.get(
            "case",
        )
        update_type = self.request.query_params.get(
            "update_type",
        )

        if case_reference:
            queryset = queryset.filter(
                case__reference_code__iexact=(
                    case_reference.strip()
                ),
            )

        if update_type:
            queryset = queryset.filter(
                update_type__iexact=update_type.strip(),
            )

        return queryset

    def perform_create(self, serializer):
        case = serializer.validated_data["case"]
        ensure_case_is_visible(
            self.request.user,
            case,
        )
        serializer.save(
            changed_by=self.request.user,
        )


class CaseRouteListCreateView(
    generics.ListCreateAPIView,
):
    serializer_class = CaseRouteSerializer
    permission_classes = (CanManageCaseRoutes,)

    def get_queryset(self):
        queryset = CaseRoute.objects.filter(
            case__in=visible_cases_for(self.request.user),
        ).select_related(
            "case",
            "route",
            "route__origin",
            "route__destination",
            "linked_by",
        )

        case_reference = self.request.query_params.get(
            "case",
        )
        route_id = self.request.query_params.get("route")

        if case_reference:
            queryset = queryset.filter(
                case__reference_code__iexact=(
                    case_reference.strip()
                ),
            )

        if route_id:
            queryset = queryset.filter(
                route_id=route_id,
            )

        return queryset

    def perform_create(self, serializer):
        case = serializer.validated_data["case"]
        ensure_case_is_visible(
            self.request.user,
            case,
        )
        serializer.save(
            linked_by=self.request.user,
        )


class CaseRouteDetailView(
    generics.RetrieveUpdateDestroyAPIView,
):
    serializer_class = CaseRouteSerializer
    permission_classes = (CanManageCaseRoutes,)

    def get_queryset(self):
        return CaseRoute.objects.filter(
            case__in=visible_cases_for(self.request.user),
        ).select_related(
            "case",
            "route",
            "route__origin",
            "route__destination",
            "linked_by",
        )

    def perform_update(self, serializer):
        case = serializer.validated_data.get(
            "case",
            serializer.instance.case,
        )
        ensure_case_is_visible(
            self.request.user,
            case,
        )
        serializer.save()


class VictimProfileListCreateView(
    generics.ListCreateAPIView,
):
    serializer_class = VictimProfileSerializer
    permission_classes = (CanManageVictimProfiles,)

    def get_queryset(self):
        queryset = VictimProfile.objects.filter(
            case__in=visible_cases_for(self.request.user),
        ).select_related(
            "case",
            "recorded_by",
        )

        case_reference = self.request.query_params.get(
            "case",
        )
        support_status = self.request.query_params.get(
            "support_status",
        )

        if case_reference:
            queryset = queryset.filter(
                case__reference_code__iexact=(
                    case_reference.strip()
                ),
            )

        if support_status:
            queryset = queryset.filter(
                support_status__iexact=(
                    support_status.strip()
                ),
            )

        return queryset

    def perform_create(self, serializer):
        case = serializer.validated_data["case"]
        ensure_case_is_visible(
            self.request.user,
            case,
        )
        serializer.save(
            recorded_by=self.request.user,
        )


class VictimProfileDetailView(
    generics.RetrieveUpdateDestroyAPIView,
):
    serializer_class = VictimProfileSerializer
    permission_classes = (CanManageVictimProfiles,)
    lookup_field = "anonymous_code"

    def get_queryset(self):
        return VictimProfile.objects.filter(
            case__in=visible_cases_for(self.request.user),
        ).select_related(
            "case",
            "recorded_by",
        )

    def perform_update(self, serializer):
        case = serializer.validated_data.get(
            "case",
            serializer.instance.case,
        )
        ensure_case_is_visible(
            self.request.user,
            case,
        )
        serializer.save()