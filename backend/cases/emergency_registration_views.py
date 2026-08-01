from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .emergency_registration_serializers import (
    EmergencyInvitationAcceptSerializer,
)
from .emergency_serializers import (
    CaseAccessGrantSerializer,
    EmergencyAccessInvitationSerializer,
)


class EmergencyInvitationAcceptView(
    generics.GenericAPIView,
):
    serializer_class = EmergencyInvitationAcceptSerializer
    permission_classes = (
        AllowAny,
    )
    authentication_classes = ()

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )
        result = serializer.save()

        user = result["user"]
        grant = result["grant"]
        invitation = result["invitation"]

        return Response(
            {
                "detail": (
                    "Emergency access activated successfully."
                ),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "access_status": user.access_status,
                    "is_active": user.is_active,
                },
                "grant": CaseAccessGrantSerializer(
                    grant,
                ).data,
                "invitation": (
                    EmergencyAccessInvitationSerializer(
                        invitation,
                    ).data
                ),
            },
            status=status.HTTP_201_CREATED,
        )