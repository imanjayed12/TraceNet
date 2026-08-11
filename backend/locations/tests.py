from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import District, Hotspot, Route


User = get_user_model()


class RouteAndHotspotPermissionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@tracenet.local",
            password="TestPassword123!",
            full_name="Test Administrator",
            role=User.Role.ADMIN,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
            is_staff=True,
        )
        self.police = User.objects.create_user(
            email="police@tracenet.local",
            password="TestPassword123!",
            full_name="Test Police Officer",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )
        self.other_police = User.objects.create_user(
            email="other-police@tracenet.local",
            password="TestPassword123!",
            full_name="Other Police Officer",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )
        self.pending_police = User.objects.create_user(
            email="pending-police@tracenet.local",
            password="TestPassword123!",
            full_name="Pending Police Officer",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.PENDING,
            is_active=False,
        )

        self.dhaka = District.objects.create(
            name="Dhaka Test",
            slug="dhaka-test",
            division=District.Division.DHAKA,
            latitude="23.810300",
            longitude="90.412500",
        )
        self.chattogram = District.objects.create(
            name="Chattogram Test",
            slug="chattogram-test",
            division=District.Division.CHATTOGRAM,
            latitude="22.356900",
            longitude="91.783200",
        )

        self.route_list_url = reverse(
            "locations:route-list",
        )
        self.hotspot_list_url = reverse(
            "locations:hotspot-list",
        )

    def route_payload(self, name="Police Submitted Route"):
        return {
            "name": name,
            "origin_id": self.dhaka.pk,
            "destination_id": self.chattogram.pk,
            "route_type": Route.RouteType.DOMESTIC,
            "transport_mode": Route.TransportMode.ROAD,
            "risk_level": Route.RiskLevel.HIGH,
            "description": "Synthetic route description.",
            "evidence_summary": (
                "Synthetic and anonymized evidence only."
            ),
            "is_verified": True,
            "is_active": False,
        }

    def create_route(
        self,
        *,
        name,
        created_by,
        is_verified=False,
        is_active=True,
    ):
        return Route.objects.create(
            name=name,
            origin=self.dhaka,
            destination=self.chattogram,
            route_type=Route.RouteType.DOMESTIC,
            transport_mode=Route.TransportMode.ROAD,
            risk_level=Route.RiskLevel.MEDIUM,
            description="Synthetic route.",
            evidence_summary="Safe synthetic evidence.",
            is_verified=is_verified,
            is_active=is_active,
            created_by=created_by,
        )

    def test_police_can_create_unverified_active_route(self):
        self.client.force_authenticate(self.police)

        response = self.client.post(
            self.route_list_url,
            self.route_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        route = Route.objects.get(
            name="Police Submitted Route",
        )

        self.assertEqual(
            route.created_by_id,
            self.police.pk,
        )
        self.assertFalse(route.is_verified)
        self.assertTrue(route.is_active)

    def test_police_can_update_own_route_information(self):
        route = self.create_route(
            name="Police Owned Route",
            created_by=self.police,
        )

        self.client.force_authenticate(self.police)

        response = self.client.patch(
            reverse(
                "locations:route-detail",
                kwargs={"pk": route.pk},
            ),
            {
                "description": (
                    "Updated synthetic route description."
                ),
                "risk_level": Route.RiskLevel.HIGH,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        route.refresh_from_db()

        self.assertEqual(
            route.description,
            "Updated synthetic route description.",
        )
        self.assertEqual(
            route.risk_level,
            Route.RiskLevel.HIGH,
        )

    def test_police_cannot_update_another_users_route(self):
        route = self.create_route(
            name="Other Police Route",
            created_by=self.other_police,
        )

        self.client.force_authenticate(self.police)

        response = self.client.patch(
            reverse(
                "locations:route-detail",
                kwargs={"pk": route.pk},
            ),
            {
                "description": "Unauthorized modification.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_police_cannot_verify_or_deactivate_route(self):
        route = self.create_route(
            name="Protected Workflow Route",
            created_by=self.police,
        )

        self.client.force_authenticate(self.police)

        response = self.client.patch(
            reverse(
                "locations:route-detail",
                kwargs={"pk": route.pk},
            ),
            {
                "is_verified": True,
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        route.refresh_from_db()

        self.assertFalse(route.is_verified)
        self.assertTrue(route.is_active)

    def test_police_cannot_delete_route(self):
        route = self.create_route(
            name="Police Nondeletable Route",
            created_by=self.police,
        )

        self.client.force_authenticate(self.police)

        response = self.client.delete(
            reverse(
                "locations:route-detail",
                kwargs={"pk": route.pk},
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertTrue(
            Route.objects.filter(pk=route.pk).exists(),
        )

    def test_admin_can_verify_and_deactivate_route(self):
        route = self.create_route(
            name="Administrator Controlled Route",
            created_by=self.police,
        )

        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse(
                "locations:route-detail",
                kwargs={"pk": route.pk},
            ),
            {
                "is_verified": True,
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        route.refresh_from_db()

        self.assertTrue(route.is_verified)
        self.assertFalse(route.is_active)

    def test_admin_can_delete_route(self):
        route = self.create_route(
            name="Administrator Deletable Route",
            created_by=self.police,
        )

        self.client.force_authenticate(self.admin)

        response = self.client.delete(
            reverse(
                "locations:route-detail",
                kwargs={"pk": route.pk},
            ),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )
        self.assertFalse(
            Route.objects.filter(pk=route.pk).exists(),
        )

    def test_police_can_view_but_cannot_create_hotspot(self):
        Hotspot.objects.create(
            name="Visible Test Hotspot",
            district=self.dhaka,
            latitude="23.810300",
            longitude="90.412500",
            hotspot_type=Hotspot.HotspotType.TRANSIT_HUB,
            created_by=self.admin,
        )

        self.client.force_authenticate(self.police)

        list_response = self.client.get(
            self.hotspot_list_url,
        )

        self.assertEqual(
            list_response.status_code,
            status.HTTP_200_OK,
        )

        create_response = self.client.post(
            self.hotspot_list_url,
            {
                "name": "Unauthorized Police Hotspot",
                "district_id": self.dhaka.pk,
                "latitude": "23.810300",
                "longitude": "90.412500",
                "hotspot_type": (
                    Hotspot.HotspotType.TRANSIT_HUB
                ),
                "recent_case_count": 2,
                "active_route_count": 2,
                "verified_route_count": 1,
                "vulnerability_score": 40,
            },
            format="json",
        )

        self.assertEqual(
            create_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_pending_police_cannot_access_routes(self):
        self.client.force_authenticate(
            self.pending_police,
        )

        list_response = self.client.get(
            self.route_list_url,
        )
        create_response = self.client.post(
            self.route_list_url,
            self.route_payload(
                name="Pending User Route",
            ),
            format="json",
        )

        self.assertEqual(
            list_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            create_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )