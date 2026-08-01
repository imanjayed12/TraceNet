from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.test import RequestFactory
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .middleware import ApiMutationAuditMiddleware
from .models import AuditLog
from .services import (
    record_audit_event,
    sanitize_metadata,
)


User = get_user_model()


class AuditLoggingTests(APITestCase):
    def setUp(self):
        self.password = "Strong-Test-Password-927!"

        self.user = User.objects.create_user(
            email="audit.admin@tracenet.local",
            full_name="Audit Test Administrator",
            password=self.password,
            role="admin",
            access_status="approved",
            is_active=True,
            is_staff=True,
        )

        self.police_user = User.objects.create_user(
            email="audit.police@tracenet.local",
            full_name="Audit Test Police",
            password=self.password,
            role="police",
            access_status="approved",
            is_active=True,
        )

        self.login_url = reverse(
            "accounts:login",
        )
        self.logout_url = reverse(
            "accounts:logout",
        )
        self.audit_url = reverse(
            "audit:audit-log-list",
        )

    def login(self):
        return self.client.post(
            self.login_url,
            {
                "email": self.user.email,
                "password": self.password,
            },
            format="json",
        )

    def test_sensitive_metadata_is_redacted(self):
        metadata = sanitize_metadata(
            {
                "event": "test",
                "password": "secret-password",
                "access": "secret-access-token",
                "nested": {
                    "refresh": "secret-refresh-token",
                },
            }
        )

        self.assertEqual(
            metadata["event"],
            "test",
        )
        self.assertEqual(
            metadata["password"],
            "[REDACTED]",
        )
        self.assertEqual(
            metadata["access"],
            "[REDACTED]",
        )
        self.assertEqual(
            metadata["nested"]["refresh"],
            "[REDACTED]",
        )

    def test_successful_and_failed_login_are_audited(self):
        success_response = self.login()

        self.assertEqual(
            success_response.status_code,
            status.HTTP_200_OK,
        )

        successful_log = AuditLog.objects.get(
            action=AuditLog.Action.LOGIN,
        )

        self.assertEqual(
            successful_log.actor,
            self.user,
        )
        self.assertEqual(
            successful_log.actor_email,
            self.user.email,
        )
        self.assertTrue(
            successful_log.success,
        )
        self.assertEqual(
            successful_log.request_path,
            self.login_url,
        )

        failed_response = self.client.post(
            self.login_url,
            {
                "email": self.user.email,
                "password": "Incorrect-Password-927!",
            },
            format="json",
        )

        self.assertEqual(
            failed_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        failed_log = AuditLog.objects.get(
            action=AuditLog.Action.LOGIN_FAILED,
        )

        self.assertEqual(
            failed_log.actor_email,
            self.user.email,
        )
        self.assertFalse(
            failed_log.success,
        )
        self.assertNotIn(
            "Incorrect-Password",
            str(failed_log.metadata),
        )

    def test_logout_is_audited(self):
        login_response = self.login()

        access_token = login_response.data["access"]
        refresh_token = login_response.data["refresh"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )

        logout_response = self.client.post(
            self.logout_url,
            {
                "refresh": refresh_token,
            },
            format="json",
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_200_OK,
        )

        logout_log = AuditLog.objects.get(
            action=AuditLog.Action.LOGOUT,
        )

        self.assertEqual(
            logout_log.actor,
            self.user,
        )
        self.assertTrue(
            logout_log.success,
        )
        self.assertNotIn(
            refresh_token,
            str(logout_log.metadata),
        )

    def test_api_mutation_middleware_creates_log(self):
        request = RequestFactory().post(
            "/api/cases/updates/",
            data={},
            content_type="application/json",
        )
        request.user = self.user

        middleware = ApiMutationAuditMiddleware(
            lambda request: JsonResponse(
                {"detail": "created"},
                status=201,
            )
        )

        response = middleware(request)

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        mutation_log = AuditLog.objects.get(
            action=AuditLog.Action.CREATE,
            resource_type="cases",
        )

        self.assertEqual(
            mutation_log.actor,
            self.user,
        )
        self.assertEqual(
            mutation_log.request_path,
            "/api/cases/updates/",
        )
        self.assertTrue(
            mutation_log.success,
        )

    def test_only_admin_can_view_audit_api(self):
        record_audit_event(
            action=AuditLog.Action.VIEW,
            actor=self.user,
            resource_type="test",
            resource_id="1",
            resource_label="Synthetic audit test",
            success=True,
        )

        self.client.force_authenticate(
            user=self.user,
        )

        admin_response = self.client.get(
            self.audit_url,
        )

        self.assertEqual(
            admin_response.status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(
            user=self.police_user,
        )

        police_response = self.client.get(
            self.audit_url,
        )

        self.assertEqual(
            police_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )