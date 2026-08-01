from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from locations.models import (
    District,
    Route,
)

from .models import (
    Alert,
    AlertRecipient,
)


class AlertAutomationTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email="alert.admin@tracenet.local",
            password="Admin#Alert2026",
            full_name="Synthetic Alert Admin",
            role=User.Role.ADMIN,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.police_user = User.objects.create_user(
            email="alert.police@tracenet.local",
            password="Police#Alert2026",
            full_name="Synthetic Alert Police",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.analyst_user = User.objects.create_user(
            email="alert.analyst@tracenet.local",
            password="Analyst#Alert2026",
            full_name="Synthetic Alert Analyst",
            role=User.Role.ANALYST,
            access_status=User.AccessStatus.APPROVED,
            is_active=True,
        )

        self.emergency_user = User.objects.create_user(
            email="alert.emergency@tracenet.local",
            password="Emergency#Alert2026",
            full_name="Synthetic Emergency User",
            role=User.Role.POLICE,
            access_status=User.AccessStatus.EMERGENCY,
            is_active=True,
        )

        self.origin = District.objects.create(
            name="Synthetic Alert Origin",
            slug="synthetic-alert-origin",
            division=District.Division.DHAKA,
            latitude="23.700000",
            longitude="90.400000",
        )

        self.destination = District.objects.create(
            name="Synthetic Alert Destination",
            slug="synthetic-alert-destination",
            division=District.Division.KHULNA,
            latitude="23.100000",
            longitude="89.200000",
        )

        self.route = Route.objects.create(
            name="Synthetic Automated Alert Route",
            origin=self.origin,
            destination=self.destination,
            route_type=Route.RouteType.DOMESTIC,
            transport_mode=Route.TransportMode.ROAD,
            risk_level=Route.RiskLevel.MEDIUM,
            description="Synthetic route for alert tests.",
            evidence_summary=(
                "Synthetic evidence used only for testing."
            ),
            created_by=self.admin_user,
        )

    def trigger_critical_route_alert(self):
        self.route.risk_level = (
            Route.RiskLevel.CRITICAL
        )
        self.route.save()

        return Alert.objects.get(
            route=self.route,
            severity=Alert.Severity.CRITICAL,
        )

    def test_route_risk_change_creates_one_alert(self):
        alert = self.trigger_critical_route_alert()

        self.assertEqual(
            Alert.objects.count(),
            1,
        )
        self.assertEqual(
            alert.alert_type,
            Alert.AlertType.ROUTE,
        )

        recipient_emails = set(
            alert.recipient_records.values_list(
                "user__email",
                flat=True,
            )
        )

        self.assertEqual(
            recipient_emails,
            {
                self.admin_user.email,
                self.police_user.email,
                self.analyst_user.email,
            },
        )
        self.assertNotIn(
            self.emergency_user.email,
            recipient_emails,
        )

        self.route.save()

        self.assertEqual(
            Alert.objects.count(),
            1,
        )

    def test_recipient_can_acknowledge_alert(self):
        alert = self.trigger_critical_route_alert()

        recipient = AlertRecipient.objects.get(
            alert=alert,
            user=self.police_user,
        )

        self.client.force_authenticate(
            user=self.police_user,
        )

        inbox_response = self.client.get(
            reverse(
                "alerts:alert-inbox",
            )
        )

        self.assertEqual(
            inbox_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            len(inbox_response.data),
            1,
        )
        self.assertFalse(
            inbox_response.data[0]["is_read"],
        )

        acknowledge_response = self.client.post(
            reverse(
                "alerts:alert-acknowledge",
                kwargs={
                    "pk": recipient.pk,
                },
            )
        )

        self.assertEqual(
            acknowledge_response.status_code,
            status.HTTP_200_OK,
        )

        recipient.refresh_from_db()

        self.assertTrue(
            recipient.is_read,
        )
        self.assertTrue(
            recipient.is_acknowledged,
        )
        self.assertIsNotNone(
            recipient.read_at,
        )
        self.assertIsNotNone(
            recipient.acknowledged_at,
        )