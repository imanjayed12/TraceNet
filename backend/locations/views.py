from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import District
from .serializers import DistrictSerializer


class DistrictListView(generics.ListAPIView):
    serializer_class = DistrictSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        queryset = District.objects.filter(is_active=True)

        division = self.request.query_params.get("division")
        search = self.request.query_params.get("search")

        if division:
            queryset = queryset.filter(division__iexact=division.strip())

        if search:
            queryset = queryset.filter(name__icontains=search.strip())

        return queryset.order_by("name")


class DistrictDetailView(generics.RetrieveAPIView):
    serializer_class = DistrictSerializer
    permission_classes = (AllowAny,)
    lookup_field = "slug"

    queryset = District.objects.filter(is_active=True)