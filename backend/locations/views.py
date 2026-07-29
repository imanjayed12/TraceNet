from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import District, Route
from .permissions import CanManageRoutes
from .serializers import DistrictSerializer, RouteSerializer


class DistrictListView(generics.ListAPIView):
    serializer_class = DistrictSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        queryset = District.objects.filter(is_active=True)

        division = self.request.query_params.get("division")
        search = self.request.query_params.get("search")

        if division:
            queryset = queryset.filter(
                division__iexact=division.strip(),
            )

        if search:
            queryset = queryset.filter(
                name__icontains=search.strip(),
            )

        return queryset.order_by("name")


class DistrictDetailView(generics.RetrieveAPIView):
    serializer_class = DistrictSerializer
    permission_classes = (AllowAny,)
    lookup_field = "slug"

    queryset = District.objects.filter(is_active=True)


class RouteListCreateView(generics.ListCreateAPIView):
    serializer_class = RouteSerializer
    permission_classes = (CanManageRoutes,)

    def get_queryset(self):
        queryset = Route.objects.select_related(
            "origin",
            "destination",
            "created_by",
        )

        include_inactive = self.request.query_params.get(
            "include_inactive",
        )
        origin = self.request.query_params.get("origin")
        destination = self.request.query_params.get("destination")
        route_type = self.request.query_params.get("route_type")
        transport_mode = self.request.query_params.get(
            "transport_mode",
        )
        risk_level = self.request.query_params.get("risk_level")
        is_verified = self.request.query_params.get("is_verified")
        search = self.request.query_params.get("search")

        if include_inactive != "true":
            queryset = queryset.filter(is_active=True)

        if origin:
            queryset = queryset.filter(
                origin__slug__iexact=origin.strip(),
            )

        if destination:
            queryset = queryset.filter(
                destination__slug__iexact=destination.strip(),
            )

        if route_type:
            queryset = queryset.filter(
                route_type__iexact=route_type.strip(),
            )

        if transport_mode:
            queryset = queryset.filter(
                transport_mode__iexact=transport_mode.strip(),
            )

        if risk_level:
            queryset = queryset.filter(
                risk_level__iexact=risk_level.strip(),
            )

        if is_verified in {"true", "false"}:
            queryset = queryset.filter(
                is_verified=is_verified == "true",
            )

        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(origin__name__icontains=search)
                | Q(destination__name__icontains=search)
                | Q(description__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RouteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RouteSerializer
    permission_classes = (CanManageRoutes,)

    queryset = Route.objects.select_related(
        "origin",
        "destination",
        "created_by",
    )