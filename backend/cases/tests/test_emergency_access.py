from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from locations.models import District

from cases.models import (
    Case,
    CaseAccessGrant,
    EmergencyAccessInvitation,
)


class EmergencyAccessWorkflowTests(APITestCase):
    emergency_email = (
        "emergency.test.officer@tracenet.local"
    )
    emergency_password = "TraceNet#Emergency2026"

    def setUp(self):
        self.sponsor = User.objects.create_user(
            email="sponsor.police@tracenet.local",
            password="Sponsor#Password2026",
            full_name="Synthetic Sponsor Police",
            organization="TraceNet Test Police Unit",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.district = District.objects.create(
            name="Synthetic Test District",
            slug="synthetic-test-district",
            division=District.Division.DHAKA,
            latitude="23.700000",
            longitude="90.400000",
        )

        self.case = Case.objects.create(
            title="Synthetic Emergency Test Case",
            category=Case.Category.SUSPECTED,
            status=Case.Status.REPORTED,
            priority=Case.Priority.HIGH,
            confidentiality=(
                Case.Confidentiality.RESTRICTED
            ),
            summary=(
                "Synthetic sensitive summary used only "
                "for automated testing."
            ),
            incident_district=self.district,
            location_description=(
                "Synthetic protected test location"
            ),
            incident_date=timezone.localdate(),
            total_victims=3,
            minor_victims=1,
            reported_by=self.sponsor,
            assigned_to=self.sponsor,
        )

    def test_complete_emergency_access_workflow(self):
        self.client.force_authenticate(
            user=self.sponsor,
        )

        invitation_response = self.client.post(
            reverse(
                "cases:emergency-invitation-list",
            ),
            {
                "case_reference": (
                    self.case.reference_code
                ),
                "invitee_email": self.emergency_email,
                "reason": (
                    "Urgent synthetic support required "
                    "for automated security testing."
                ),
                "expires_in_hours": 6,
            },
            format="json",
        )

        self.assertEqual(
            invitation_response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            invitation_response.data["status"],
            EmergencyAccessInvitation.Status.PENDING,
        )

        invitation_token = invitation_response.data["token"]

        self.client.force_authenticate(
            user=None,
        )

        acceptance_response = self.client.post(
            reverse(
                "cases:emergency-access-accept",
            ),
            {
                "token": invitation_token,
                "email": self.emergency_email,
                "full_name": (
                    "Synthetic Emergency Test Officer"
                ),
                "phone": "",
                "organization": (
                    "TraceNet Emergency Test Unit"
                ),
                "password": self.emergency_password,
                "password_confirm": (
                    self.emergency_password
                ),
            },
            format="json",
        )

        self.assertEqual(
            acceptance_response.status_code,
            status.HTTP_201_CREATED,
        )

        emergency_user = User.objects.get(
            email=self.emergency_email,
        )

        self.assertEqual(
            emergency_user.access_status,
            User.AccessStatus.EMERGENCY,
        )
        self.assertTrue(
            emergency_user.is_active,
        )

        grant = CaseAccessGrant.objects.get(
            case=self.case,
            user=emergency_user,
        )

        self.assertTrue(
            grant.is_valid,
        )
        self.assertEqual(
            grant.access_level,
            CaseAccessGrant.AccessLevel.LIMITED,
        )

        invitation = EmergencyAccessInvitation.objects.get(
            token=invitation_token,
        )

        self.assertEqual(
            invitation.status,
            EmergencyAccessInvitation.Status.ACCEPTED,
        )

        self.client.force_authenticate(
            user=emergency_user,
        )

        case_response = self.client.get(
            reverse(
                "cases:case-list",
            )
        )

        self.assertEqual(
            case_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            len(case_response.data),
            1,
        )
        self.assertEqual(
            case_response.data[0]["reference_code"],
            self.case.reference_code,
        )

        protected_fields = {
            "summary",
            "location_description",
            "latitude",
            "longitude",
            "total_victims",
            "minor_victims",
            "reported_by",
            "assigned_to",
        }

        self.assertTrue(
            protected_fields.isdisjoint(
                case_response.data[0].keys()
            )
        )

        edit_response = self.client.patch(
            reverse(
                "cases:case-detail",
                kwargs={
                    "reference_code": (
                        self.case.reference_code
                    )
                },
            ),
            {
                "title": "Unauthorized change",
            },
            format="json",
        )

        self.assertEqual(
            edit_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        victim_response = self.client.get(
            reverse(
                "cases:victim-list",
            )
        )

        self.assertEqual(
            victim_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.force_authenticate(
            user=self.sponsor,
        )

        revoke_response = self.client.post(
            reverse(
                "cases:emergency-grant-revoke",
                kwargs={
                    "pk": grant.pk,
                },
            ),
            {
                "reason": (
                    "Automated emergency operation "
                    "completed successfully."
                )
            },
            format="json",
        )

        self.assertEqual(
            revoke_response.status_code,
            status.HTTP_200_OK,
        )

        grant.refresh_from_db()
        emergency_user.refresh_from_db()

        self.assertFalse(
            grant.is_active,
        )
        self.assertFalse(
            grant.is_valid,
        )
        self.assertFalse(
            emergency_user.is_active,
        )
        self.assertIsNotNone(
            grant.revoked_at,
        )