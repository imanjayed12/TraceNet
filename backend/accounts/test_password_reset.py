from urllib.parse import parse_qs, urlparse

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from audit.models import AuditLog


User = get_user_model()


class PasswordResetWorkflowTests(APITestCase):
    old_password = "Existing#TraceNet2026"
    new_password = "Changed#TraceNet2027"

    def setUp(self):
        cache.clear()
        mail.outbox.clear()

        self.user = User.objects.create_user(
            email="reset.user@tracenet.local",
            password=self.old_password,
            full_name="Password Reset Test User",
            organization="TraceNet Security Test Unit",
            role=User.Role.ANALYST,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.request_url = reverse(
            "accounts:password-reset-request"
        )
        self.confirm_url = reverse(
            "accounts:password-reset-confirm"
        )

    def request_reset(self, email=None):
        return self.client.post(
            self.request_url,
            {
                "email": email or self.user.email,
            },
            format="json",
        )

    def reset_parameters(self):
        response = self.request_reset()

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(mail.outbox), 1)

        reset_link = next(
            item
            for item in mail.outbox[0].body.split()
            if item.startswith("http")
        )
        query = parse_qs(urlparse(reset_link).query)

        return {
            "uid": query["uid"][0],
            "token": query["token"][0],
        }

    def confirm_reset(self, parameters, **overrides):
        payload = {
            **parameters,
            "new_password": self.new_password,
            "new_password_confirm": self.new_password,
            **overrides,
        }

        return self.client.post(
            self.confirm_url,
            payload,
            format="json",
        )

    def test_known_and_unknown_emails_receive_same_response(self):
        known_response = self.request_reset()
        known_detail = known_response.data["detail"]

        mail.outbox.clear()

        unknown_response = self.request_reset(
            "unknown.user@tracenet.local"
        )

        self.assertEqual(
            known_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            unknown_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            unknown_response.data["detail"],
            known_detail,
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_pending_and_inactive_accounts_receive_no_email(self):
        pending_user = User.objects.create_user(
            email="pending.reset@tracenet.local",
            password=self.old_password,
            full_name="Pending Reset User",
            organization="TraceNet Pending Unit",
            role=User.Role.NGO,
            access_status=User.AccessStatus.PENDING,
            is_active=False,
        )

        response = self.request_reset(pending_user.email)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_email_contains_frontend_link(self):
        parameters = self.reset_parameters()

        self.assertTrue(parameters["uid"])
        self.assertTrue(parameters["token"])
        self.assertIn(
            "/reset-password?",
            mail.outbox[0].body,
        )
        self.assertNotIn(
            self.old_password,
            mail.outbox[0].body,
        )

    def test_password_reset_is_one_time_and_revokes_sessions(self):
        RefreshToken.for_user(self.user)
        outstanding_token = OutstandingToken.objects.get(
            user=self.user,
        )
        parameters = self.reset_parameters()

        response = self.confirm_reset(parameters)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.user.refresh_from_db()
        self.assertFalse(
            self.user.check_password(self.old_password)
        )
        self.assertTrue(
            self.user.check_password(self.new_password)
        )
        self.assertTrue(
            BlacklistedToken.objects.filter(
                token=outstanding_token,
            ).exists()
        )

        reused_response = self.confirm_reset(parameters)

        self.assertEqual(
            reused_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_invalid_token_is_rejected_generically(self):
        parameters = self.reset_parameters()
        parameters["token"] = "invalid-reset-token"

        response = self.confirm_reset(parameters)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "invalid or has expired",
            str(response.data).lower(),
        )

    def test_reset_rejects_password_mismatch(self):
        parameters = self.reset_parameters()

        response = self.confirm_reset(
            parameters,
            new_password_confirm="Different#Password2027",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "new_password_confirm",
            response.data,
        )

    def test_reset_rejects_weak_or_reused_password(self):
        parameters = self.reset_parameters()

        weak_response = self.confirm_reset(
            parameters,
            new_password="password",
            new_password_confirm="password",
        )

        self.assertEqual(
            weak_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        reused_response = self.confirm_reset(
            parameters,
            new_password=self.old_password,
            new_password_confirm=self.old_password,
        )

        self.assertEqual(
            reused_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_request_and_completion_are_audited(self):
        parameters = self.reset_parameters()
        response = self.confirm_reset(parameters)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertTrue(
            AuditLog.objects.filter(
                resource_type="password_reset_request",
                actor_email=self.user.email,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                resource_type="password_reset",
                actor=self.user,
                success=True,
            ).exists()
        )

    def test_reset_request_is_rate_limited(self):
        for _ in range(5):
            response = self.request_reset(
                "rate.limit@tracenet.local"
            )
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
            )

        blocked_response = self.request_reset(
            "rate.limit@tracenet.local"
        )

        self.assertEqual(
            blocked_response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
