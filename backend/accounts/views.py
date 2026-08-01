from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLog
from audit.services import record_audit_event

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
)


User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = (AllowAny,)
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        email = str(
            request.data.get("email", "")
        ).strip().lower()

        try:
            response = super().post(
                request,
                *args,
                **kwargs,
            )
        except APIException:
            record_audit_event(
                action=AuditLog.Action.LOGIN_FAILED,
                request=request,
                actor_email=email,
                resource_type="authentication",
                resource_label="Failed login attempt",
                status_code=status.HTTP_401_UNAUTHORIZED,
                success=False,
                metadata={
                    "reason": (
                        "invalid_credentials_or_access"
                    ),
                },
            )
            raise

        user = User.objects.filter(
            email__iexact=email,
        ).first()

        record_audit_event(
            action=AuditLog.Action.LOGIN,
            request=request,
            actor=user,
            actor_email=email,
            resource_type="authentication",
            resource_id=user.pk if user else "",
            resource_label="Successful login",
            status_code=response.status_code,
            success=True,
        )

        return response


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserProfileSerializer(
            request.user,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            record_audit_event(
                action=AuditLog.Action.LOGOUT,
                request=request,
                resource_type="authentication",
                resource_id=request.user.pk,
                resource_label="Logout failed",
                status_code=status.HTTP_400_BAD_REQUEST,
                success=False,
                metadata={
                    "reason": "refresh_token_missing",
                },
            )

            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            record_audit_event(
                action=AuditLog.Action.LOGOUT,
                request=request,
                resource_type="authentication",
                resource_id=request.user.pk,
                resource_label="Logout failed",
                status_code=status.HTTP_400_BAD_REQUEST,
                success=False,
                metadata={
                    "reason": (
                        "invalid_or_expired_refresh_token"
                    ),
                },
            )

            return Response(
                {
                    "detail": (
                        "Invalid or expired refresh token."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        record_audit_event(
            action=AuditLog.Action.LOGOUT,
            request=request,
            resource_type="authentication",
            resource_id=request.user.pk,
            resource_label="Successful logout",
            status_code=status.HTTP_200_OK,
            success=True,
        )

        return Response(
            {"detail": "Logout successful."},
            status=status.HTTP_200_OK,
        )