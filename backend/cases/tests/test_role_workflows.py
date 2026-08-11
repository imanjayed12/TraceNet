from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from locations.models import District

from cases.models import (
    Case,
    CaseUpdate,
    VictimProfile,
)


class NgoCaseWorkflowTests(APITestCase):
    def setUp(self):
        self.ngo_user = User.objects.create_user(
            email="ngo.workflow@tracenet.local",
            password="Ngo#Workflow2026",
            full_name="Synthetic NGO Workflow Officer",
            organization="TraceNet NGO Support Unit",
            role=User.Role.NGO,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.police_user = User.objects.create_user(
            email="police.workflow@tracenet.local",
            password="Police#Workflow2026",
            full_name="Synthetic Police Workflow Officer",
            organization="TraceNet Police Unit",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.district = District.objects.create(
            name="Synthetic NGO Test District",
            slug="synthetic-ngo-test-district",
            division=District.Division.DHAKA,
            latitude="23.700000",
            longitude="90.400000",
        )

        self.ngo_case = Case.objects.create(
            title="Synthetic NGO Support Case",
            category=Case.Category.SUSPECTED,
            status=Case.Status.REPORTED,
            priority=Case.Priority.HIGH,
            confidentiality=(
                Case.Confidentiality.RESTRICTED
            ),
            summary=(
                "An anonymized synthetic case used for "
                "testing the NGO support workflow."
            ),
            incident_district=self.district,
            location_description=(
                "Synthetic NGO protected test location"
            ),
            incident_date=timezone.localdate(),
            total_victims=2,
            minor_victims=1,
            reported_by=self.ngo_user,
        )

        self.police_case = Case.objects.create(
            title="Synthetic Police Restricted Case",
            category=Case.Category.CONFIRMED,
            status=Case.Status.INVESTIGATING,
            priority=Case.Priority.CRITICAL,
            confidentiality=(
                Case.Confidentiality.RESTRICTED
            ),
            summary=(
                "An anonymized synthetic police case "
                "that must not be visible to the NGO."
            ),
            incident_district=self.district,
            location_description=(
                "Synthetic police protected location"
            ),
            incident_date=timezone.localdate(),
            total_victims=1,
            minor_victims=0,
            reported_by=self.police_user,
            assigned_to=self.police_user,
        )

        self.client.force_authenticate(
            user=self.ngo_user,
        )

    @staticmethod
    def response_items(response):
        if isinstance(response.data, list):
            return response.data

        return response.data["results"]

    def test_ngo_only_sees_own_or_assigned_cases(self):
        response = self.client.get(
            reverse("cases:case-list"),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        items = self.response_items(response)
        reference_codes = {
            item["reference_code"]
            for item in items
        }

        self.assertIn(
            self.ngo_case.reference_code,
            reference_codes,
        )
        self.assertNotIn(
            self.police_case.reference_code,
            reference_codes,
        )

    def test_ngo_cannot_open_unassigned_police_case(self):
        response = self.client.get(
            reverse(
                "cases:case-detail",
                kwargs={
                    "reference_code": (
                        self.police_case.reference_code
                    ),
                },
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_ngo_cannot_see_internal_case_updates(self):
        public_update = CaseUpdate.objects.create(
            case=self.ngo_case,
            update_type=CaseUpdate.UpdateType.NOTE,
            note=(
                "Synthetic public victim-support "
                "coordination note."
            ),
            is_internal=False,
            changed_by=self.ngo_user,
        )

        internal_update = CaseUpdate.objects.create(
            case=self.ngo_case,
            update_type=CaseUpdate.UpdateType.NOTE,
            note=(
                "Synthetic internal police operational "
                "note that must remain hidden."
            ),
            is_internal=True,
            changed_by=self.police_user,
        )

        response = self.client.get(
            reverse("cases:case-update-list"),
            {
                "case": self.ngo_case.reference_code,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        items = self.response_items(response)
        update_ids = {
            item["id"]
            for item in items
        }

        self.assertIn(public_update.id, update_ids)
        self.assertNotIn(internal_update.id, update_ids)

    def test_ngo_can_create_public_support_note(self):
        response = self.client.post(
            reverse("cases:case-update-list"),
            {
                "case_id": self.ngo_case.id,
                "update_type": (
                    CaseUpdate.UpdateType.NOTE
                ),
                "note": (
                    "Shelter and counselling referral "
                    "coordination has started."
                ),
                "is_internal": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        update = CaseUpdate.objects.get(
            id=response.data["id"],
        )

        self.assertEqual(
            update.changed_by,
            self.ngo_user,
        )
        self.assertFalse(update.is_internal)

    def test_ngo_cannot_create_internal_update(self):
        response = self.client.post(
            reverse("cases:case-update-list"),
            {
                "case_id": self.ngo_case.id,
                "update_type": (
                    CaseUpdate.UpdateType.NOTE
                ),
                "note": (
                    "Synthetic manipulated internal note."
                ),
                "is_internal": True,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "is_internal",
            response.data,
        )

    def test_ngo_cannot_create_operational_updates(self):
        protected_update_types = (
            CaseUpdate.UpdateType.ASSIGNMENT,
            CaseUpdate.UpdateType.VERIFICATION,
        )

        for update_type in protected_update_types:
            with self.subTest(update_type=update_type):
                response = self.client.post(
                    reverse(
                        "cases:case-update-list",
                    ),
                    {
                        "case_id": self.ngo_case.id,
                        "update_type": update_type,
                        "note": (
                            "Synthetic unauthorized "
                            "operational update."
                        ),
                        "is_internal": False,
                    },
                    format="json",
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn(
                    "update_type",
                    response.data,
                )

    def test_ngo_can_create_anonymous_victim_profile(self):
        response = self.client.post(
            reverse("cases:victim-list"),
            {
                "case_id": self.ngo_case.id,
                "age_group": (
                    VictimProfile.AgeGroup.ADOLESCENT
                ),
                "gender": (
                    VictimProfile.Gender.UNKNOWN
                ),
                "exploitation_type": (
                    VictimProfile.ExploitationType.LABOUR
                ),
                "support_status": (
                    VictimProfile.SupportStatus.REFERRED
                ),
                "country_of_origin": "Bangladesh",
                "support_needs": [
                    "medical",
                    "shelter",
                    "counselling",
                    "medical",
                ],
                "protected_note": (
                    "Anonymized synthetic support note."
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        profile = VictimProfile.objects.get(
            id=response.data["id"],
        )

        self.assertEqual(
            profile.recorded_by,
            self.ngo_user,
        )
        self.assertTrue(profile.anonymous_code)
        self.assertEqual(
            profile.support_needs,
            [
                "medical",
                "shelter",
                "counselling",
            ],
        )

    def test_victim_profile_cannot_move_to_another_case(
        self,
    ):
        profile = VictimProfile.objects.create(
            case=self.ngo_case,
            age_group=VictimProfile.AgeGroup.ADULT,
            gender=VictimProfile.Gender.UNKNOWN,
            exploitation_type=(
                VictimProfile.ExploitationType.UNKNOWN
            ),
            support_status=(
                VictimProfile.SupportStatus.IDENTIFIED
            ),
            support_needs=["legal"],
            recorded_by=self.ngo_user,
        )

        response = self.client.patch(
            reverse(
                "cases:victim-detail",
                kwargs={
                    "anonymous_code": (
                        profile.anonymous_code
                    ),
                },
            ),
            {
                "case_id": self.police_case.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "case_id",
            response.data,
        )

        profile.refresh_from_db()

        self.assertEqual(
            profile.case,
            self.ngo_case,
        )