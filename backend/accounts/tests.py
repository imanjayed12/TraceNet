from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from audit.models import AuditLog


User = get_user_model()


class UserManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@tracenet.local",
            password="StrongAdminPass123!",
            full_name="TraceNet Administrator",
            role=User.Role.ADMIN,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
            is_staff=True,
        )

        self.pending_user = User.objects.create_user(
            email="pending@tracenet.local",
            password="StrongPendingPass123!",
            full_name="Pending User",
            organization="Test Organization",
            role=User.Role.NGO,
            access_status=User.AccessStatus.PENDING,
            is_active=False,
        )

        self.approved_user = User.objects.create_user(
            email="analyst@tracenet.local",
            password="StrongAnalystPass123!",
            full_name="Approved Analyst",
            organization="TraceNet Analysis Unit",
            role=User.Role.ANALYST,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

    def authenticate(self, user):
        self.client.force_authenticate(
            user=user,
        )

    def test_non_admin_cannot_view_user_list(self):
        self.authenticate(self.approved_user)

        response = self.client.get(
            reverse("accounts:admin-user-list"),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_approved_staff_admin_can_view_users(self):
        self.authenticate(self.admin)

        response = self.client.get(
            reverse("accounts:admin-user-list"),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.data

        if isinstance(data, dict) and "results" in data:
            data = data["results"]

        emails = {
            item["email"]
            for item in data
        }

        self.assertIn(
            self.pending_user.email,
            emails,
        )
        self.assertIn(
            self.approved_user.email,
            emails,
        )

    def test_admin_can_approve_pending_user(self):
        self.authenticate(self.admin)

        response = self.client.post(
            reverse(
                "accounts:admin-user-approve",
                kwargs={
                    "pk": self.pending_user.pk,
                },
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.pending_user.refresh_from_db()

        self.assertEqual(
            self.pending_user.access_status,
            User.AccessStatus.APPROVED,
        )
        self.assertTrue(
            self.pending_user.is_active,
        )

        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.APPROVE_USER,
                actor=self.admin,
                resource_type="user",
                resource_id=str(
                    self.pending_user.pk,
                ),
                success=True,
            ).exists()
        )

    def test_admin_can_reject_pending_user(self):
        self.authenticate(self.admin)

        response = self.client.post(
            reverse(
                "accounts:admin-user-reject",
                kwargs={
                    "pk": self.pending_user.pk,
                },
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.pending_user.refresh_from_db()

        self.assertEqual(
            self.pending_user.access_status,
            User.AccessStatus.REJECTED,
        )
        self.assertFalse(
            self.pending_user.is_active,
        )

        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.REJECT_USER,
                actor=self.admin,
                resource_type="user",
                resource_id=str(
                    self.pending_user.pk,
                ),
                success=True,
            ).exists()
        )

    def test_admin_cannot_deactivate_own_account(self):
        self.authenticate(self.admin)

        response = self.client.post(
            reverse(
                "accounts:admin-user-deactivate",
                kwargs={
                    "pk": self.admin.pk,
                },
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.admin.refresh_from_db()
        self.assertTrue(
            self.admin.is_active,
        )

    def test_admin_cannot_remove_own_admin_role(self):
        self.authenticate(self.admin)

        response = self.client.patch(
            reverse(
                "accounts:admin-user-detail",
                kwargs={
                    "pk": self.admin.pk,
                },
            ),
            {
                "role": User.Role.ANALYST,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.admin.refresh_from_db()

        self.assertEqual(
            self.admin.role,
            User.Role.ADMIN,
        )

    def test_last_active_admin_is_protected(self):
        superuser = User.objects.create_superuser(
            email="security@tracenet.local",
            password="StrongSecurityPass123!",
            full_name="Security Superuser",
            role=User.Role.ANALYST,
            access_status=User.AccessStatus.APPROVED,
            is_active=False,
        )

        self.authenticate(superuser)

        response = self.client.post(
            reverse(
                "accounts:admin-user-deactivate",
                kwargs={
                    "pk": self.admin.pk,
                },
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.admin.refresh_from_db()

        self.assertTrue(
            self.admin.is_active,
        )
        self.assertEqual(
            self.admin.role,
            User.Role.ADMIN,
        )

    def test_regular_admin_cannot_modify_superuser(self):
        superuser = User.objects.create_superuser(
            email="root@tracenet.local",
            password="StrongRootPass123!",
            full_name="Root Administrator",
        )

        self.authenticate(self.admin)

        response = self.client.patch(
            reverse(
                "accounts:admin-user-detail",
                kwargs={
                    "pk": superuser.pk,
                },
            ),
            {
                "role": User.Role.NGO,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        superuser.refresh_from_db()

        self.assertTrue(
            superuser.is_superuser,
        )
        self.assertEqual(
            superuser.role,
            User.Role.ADMIN,
        )

    def test_pending_user_cannot_be_directly_activated(self):
        self.authenticate(self.admin)

        response = self.client.post(
            reverse(
                "accounts:admin-user-activate",
                kwargs={
                    "pk": self.pending_user.pk,
                },
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.pending_user.refresh_from_db()

        self.assertFalse(
            self.pending_user.is_active,
        )
        self.assertEqual(
            self.pending_user.access_status,
            User.AccessStatus.PENDING,
        )

    def test_admin_can_filter_users(self):
        self.authenticate(self.admin)

        response = self.client.get(
            reverse("accounts:admin-user-list"),
            {
                "role": User.Role.NGO,
                "access_status": (
                    User.AccessStatus.PENDING
                ),
                "is_active": "false",
                "search": "pending",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.data

        if isinstance(data, dict) and "results" in data:
            data = data["results"]

        self.assertEqual(
            len(data),
            1,
        )
        self.assertEqual(
            data[0]["email"],
            self.pending_user.email,
        )

class AuthenticationWorkflowTests(APITestCase):
    def registration_data(self, **overrides):
        data = {
            "email": "new.officer@tracenet.local",
            "full_name": "New TraceNet Officer",
            "phone": "01700000000",
            "organization": "TraceNet Partner Unit",
            "role": User.Role.NGO,
            "password": "StrongRegistrationPass123!",
            "password_confirm": (
                "StrongRegistrationPass123!"
            ),
        }
        data.update(overrides)
        return data

    def test_registration_creates_pending_inactive_user(self):
        response = self.client.post(
            reverse("accounts:register"),
            self.registration_data(
                email="NEW.OFFICER@TRACENET.LOCAL",
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        user = User.objects.get(
            email="new.officer@tracenet.local",
        )

        self.assertEqual(
            user.access_status,
            User.AccessStatus.PENDING,
        )
        self.assertFalse(user.is_active)
        self.assertEqual(
            response.data["user"]["approval_status"],
            User.AccessStatus.PENDING,
        )

    def test_admin_role_cannot_be_self_registered(self):
        response = self.client.post(
            reverse("accounts:register"),
            self.registration_data(
                email="self.admin@tracenet.local",
                role=User.Role.ADMIN,
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("role", response.data)

    def test_duplicate_email_is_rejected_case_insensitively(
        self,
    ):
        User.objects.create_user(
            email="existing@tracenet.local",
            password="ExistingUserPass123!",
            full_name="Existing User",
            organization="Existing Organization",
            role=User.Role.NGO,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        response = self.client.post(
            reverse("accounts:register"),
            self.registration_data(
                email="EXISTING@TRACENET.LOCAL",
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("email", response.data)

    def test_registration_requires_organization(self):
        response = self.client.post(
            reverse("accounts:register"),
            self.registration_data(
                email="no.organization@tracenet.local",
                organization="",
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("organization", response.data)

    def test_registration_rejects_mismatched_passwords(self):
        response = self.client.post(
            reverse("accounts:register"),
            self.registration_data(
                email="mismatch@tracenet.local",
                password_confirm="DifferentPassword123!",
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "password_confirm",
            response.data,
        )

    def test_pending_user_cannot_login_even_if_active(self):
        user = User.objects.create_user(
            email="pending.login@tracenet.local",
            password="PendingLoginPass123!",
            full_name="Pending Login User",
            organization="Pending Organization",
            role=User.Role.NGO,
            access_status=User.AccessStatus.PENDING,
            is_active=True,
        )

        response = self.client.post(
            reverse("accounts:login"),
            {
                "email": user.email,
                "password": "PendingLoginPass123!",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_rejected_user_cannot_login_even_if_active(self):
        user = User.objects.create_user(
            email="rejected.login@tracenet.local",
            password="RejectedLoginPass123!",
            full_name="Rejected Login User",
            organization="Rejected Organization",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.REJECTED,
            is_active=True,
        )

        response = self.client.post(
            reverse("accounts:login"),
            {
                "email": user.email,
                "password": "RejectedLoginPass123!",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_approved_active_user_can_login(self):
        user = User.objects.create_user(
            email="approved.login@tracenet.local",
            password="ApprovedLoginPass123!",
            full_name="Approved Login User",
            organization="Approved Organization",
            role=User.Role.ANALYST,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        response = self.client.post(
            reverse("accounts:login"),
            {
                "email": user.email,
                "password": "ApprovedLoginPass123!",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(
            response.data["user"]["access_status"],
            User.AccessStatus.APPROVED,
        )

    def test_current_user_contains_access_status(self):
        user = User.objects.create_user(
            email="profile.status@tracenet.local",
            password="ProfileStatusPass123!",
            full_name="Profile Status User",
            organization="Profile Organization",
            role=User.Role.GOVERNMENT,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.client.force_authenticate(user=user)

        response = self.client.get(
            reverse("accounts:current-user"),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["access_status"],
            User.AccessStatus.APPROVED,
        )
        self.assertIn(
            "access_status_display",
            response.data,
        )
