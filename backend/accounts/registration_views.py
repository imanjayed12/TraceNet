from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from alerts.models import Alert
from alerts.services import create_alert_with_recipients
from audit.models import AuditLog
from audit.services import record_audit_event

from .registration_serializers import RegisterSerializer


User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )
        user = serializer.save()

        record_audit_event(
            action=AuditLog.Action.CREATE,
            request=request,
            actor=user,
            actor_email=user.email,
            resource_type="user_registration",
            resource_id=user.pk,
            resource_label="Registration submitted",
            status_code=status.HTTP_201_CREATED,
            success=True,
            metadata={
                "role": user.role,
                "organization": user.organization,
                "access_status": user.access_status,
                "is_active": user.is_active,
            },
        )


        administrators = User.objects.filter(
            role=User.Role.ADMIN,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
            is_staff=True,
        )

        create_alert_with_recipients(
            alert_type=Alert.AlertType.SYSTEM,
            severity=Alert.Severity.WARNING,
            title="New registration awaiting approval",
            message=(
                "A new professional account registration "
                "requires administrator review."
            ),
            explicit_users=administrators,
        )
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
                    "approval_status": user.access_status,
                },
            },
            status=status.HTTP_201_CREATED,
        )