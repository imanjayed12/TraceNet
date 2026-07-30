from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .registration_serializers import RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )
        user = serializer.save()

        return Response(
            {
                "detail": (
                    "Registration submitted successfully. "
                    "An administrator must approve your "
                    "account before you can log in."
                ),
                "user": {
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "organization": user.organization,
                    "is_active": user.is_active,
                    "approval_status": "pending",
                },
            },
            status=status.HTTP_201_CREATED,
        )