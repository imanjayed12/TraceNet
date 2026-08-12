from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from audit.models import AuditLog
from audit.services import record_audit_event


User = get_user_model()


GENERIC_RESET_RESPONSE = (
    "If an eligible account exists for this email, "
    "a password reset link has been sent."
)

INVALID_RESET_TOKEN_MESSAGE = (
    "This password reset link is invalid or has expired."
)


def is_reset_eligible(user):
    return bool(
        user
        and user.is_active
        and user.access_status
        in {
            User.AccessStatus.APPROVED,
            User.AccessStatus.EMERGENCY,
        }
    )


def revoke_user_sessions(user):
    outstanding_tokens = OutstandingToken.objects.filter(
        user=user,
    )

    for outstanding_token in outstanding_tokens:
        BlacklistedToken.objects.get_or_create(
            token=outstanding_token,
        )


class PasswordResetRequestThrottle(AnonRateThrottle):
    scope = "password_reset_request"
    rate = "5/hour"


class PasswordResetConfirmThrottle(AnonRateThrottle):
    scope = "password_reset_confirm"
    rate = "10/hour"


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        max_length=254,
        write_only=True,
    )

    def validate_email(self, value):
        return value.strip().lower()

    def save(self, **kwargs):
        email = self.validated_data["email"]
        request = self.context.get("request")

        user = User.objects.filter(
            email__iexact=email,
        ).first()

        delivery_attempted = False
        delivery_succeeded = False

        if is_reset_eligible(user):
            delivery_attempted = True

            uid = urlsafe_base64_encode(
                force_bytes(user.pk),
            )
            token = default_token_generator.make_token(user)
            query_string = urlencode(
                {
                    "uid": uid,
                    "token": token,
                }
            )
            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f"/reset-password?{query_string}"
            )

            message = (
                f"Hello {user.full_name},\n\n"
                "A password reset was requested for your "
                "TraceNet account.\n\n"
                f"Reset your password: {reset_url}\n\n"
                "This link is temporary and can only be used "
                "once. If you did not request this change, "
                "you can ignore this email.\n\n"
                "TraceNet Security"
            )

            try:
                sent_count = send_mail(
                    subject="Reset your TraceNet password",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                delivery_succeeded = sent_count == 1
            except Exception:
                delivery_succeeded = False

        record_audit_event(
            action=AuditLog.Action.CREATE,
            request=request,
            actor=user if is_reset_eligible(user) else None,
            actor_email=email,
            resource_type="password_reset_request",
            resource_id=(
                user.pk if is_reset_eligible(user) else ""
            ),
            resource_label="Password reset requested",
            status_code=status.HTTP_200_OK,
            success=(
                delivery_succeeded
                if delivery_attempted
                else True
            ),
            metadata={
                "delivery_attempted": delivery_attempted,
                "delivery_succeeded": delivery_succeeded,
            },
        )

        return user


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(write_only=True)
    token = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        new_password_confirm = attrs.get(
            "new_password_confirm"
        )

        if new_password != new_password_confirm:
            raise serializers.ValidationError(
                {
                    "new_password_confirm": (
                        "The two passwords do not match."
                    )
                }
            )

        try:
            user_id = force_str(
                urlsafe_base64_decode(attrs.get("uid", ""))
            )
            user = User.objects.get(pk=user_id)
        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
        ) as error:
            raise serializers.ValidationError(
                {
                    "detail": INVALID_RESET_TOKEN_MESSAGE,
                }
            ) from error

        token_is_valid = default_token_generator.check_token(
            user,
            attrs.get("token", ""),
        )

        if not is_reset_eligible(user) or not token_is_valid:
            raise serializers.ValidationError(
                {
                    "detail": INVALID_RESET_TOKEN_MESSAGE,
                }
            )

        try:
            validate_password(
                new_password,
                user=user,
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                {
                    "new_password": list(error.messages),
                }
            ) from error

        if user.check_password(new_password):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "The new password must differ from "
                        "the current password."
                    )
                }
            )

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(
            self.validated_data["new_password"]
        )
        user.save(update_fields=["password"])
        revoke_user_sessions(user)
        return user


class PasswordResetRequestView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (PasswordResetRequestThrottle,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": GENERIC_RESET_RESPONSE,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (PasswordResetConfirmThrottle,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        record_audit_event(
            action=AuditLog.Action.UPDATE,
            request=request,
            actor=user,
            actor_email=user.email,
            resource_type="password_reset",
            resource_id=user.pk,
            resource_label="Password reset completed",
            status_code=status.HTTP_200_OK,
            success=True,
            metadata={
                "sessions_revoked": True,
            },
        )

        return Response(
            {
                "detail": (
                    "Password reset successfully. "
                    "Please sign in with your new password."
                )
            },
            status=status.HTTP_200_OK,
        )
