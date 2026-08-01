from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .exporters import build_report_export
from .models import Report
from .services import generate_report


User = get_user_model()


class ReportGenerationTests(APITestCase):
    def setUp(self):
        self.password = "Strong-Report-Password-927!"

        self.admin_user = User.objects.create_user(
            email="report.admin@tracenet.local",
            full_name="Report Test Administrator",
            password=self.password,
            role="admin",
            access_status="approved",
            is_active=True,
        )

        self.analyst_user = User.objects.create_user(
            email="report.analyst@tracenet.local",
            full_name="Report Test Analyst",
            password=self.password,
            role="analyst",
            access_status="approved",
            is_active=True,
        )

        self.police_user = User.objects.create_user(
            email="report.police@tracenet.local",
            full_name="Report Test Police",
            password=self.password,
            role="police",
            access_status="approved",
            is_active=True,
        )

        self.report_url = reverse(
            "reports:report-list",
        )

    def create_completed_report(
        self,
        output_format="json",
    ):
        report = Report.objects.create(
            title=f"Synthetic {output_format.upper()} Report",
            report_type=(
                Report.ReportType.EXECUTIVE_SUMMARY
            ),
            output_format=output_format,
            generated_by=self.admin_user,
        )

        return generate_report(report)

    def test_generate_executive_report(self):
        report = self.create_completed_report()
        report.refresh_from_db()

        self.assertEqual(
            report.status,
            Report.Status.COMPLETED,
        )
        self.assertIsNotNone(
            report.generated_at,
        )

        for section in (
            "cases",
            "risk",
            "alerts",
            "compliance",
        ):
            self.assertIn(
                section,
                report.summary,
            )

    def test_admin_and_analyst_can_generate_reports(self):
        payload = {
            "title": "Synthetic Case Analysis",
            "report_type": "case_analysis",
            "output_format": "json",
            "filters": {
                "source": "automated_test",
            },
        }

        self.client.force_authenticate(
            user=self.admin_user,
        )
        admin_response = self.client.post(
            self.report_url,
            payload,
            format="json",
        )

        self.assertEqual(
            admin_response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            admin_response.data["status"],
            Report.Status.COMPLETED,
        )

        self.client.force_authenticate(
            user=self.analyst_user,
        )
        analyst_response = self.client.post(
            self.report_url,
            {
                **payload,
                "title": "Synthetic Analyst Report",
            },
            format="json",
        )

        self.assertEqual(
            analyst_response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_police_denied_and_dates_validated(self):
        self.client.force_authenticate(
            user=self.police_user,
        )
        denied_response = self.client.get(
            self.report_url,
        )

        self.assertEqual(
            denied_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.force_authenticate(
            user=self.admin_user,
        )
        invalid_response = self.client.post(
            self.report_url,
            {
                "title": "Invalid Date Report",
                "report_type": "case_analysis",
                "output_format": "json",
                "date_from": "2026-08-10",
                "date_to": "2026-08-01",
            },
            format="json",
        )

        self.assertEqual(
            invalid_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_json_csv_and_pdf_exports(self):
        expected_exports = {
            "json": (
                "application/json",
                b"{",
            ),
            "csv": (
                "text/csv; charset=utf-8",
                b"\xef\xbb\xbf",
            ),
            "pdf": (
                "application/pdf",
                b"%PDF",
            ),
        }

        for output_format, expected in (
            expected_exports.items()
        ):
            with self.subTest(
                output_format=output_format,
            ):
                report = self.create_completed_report(
                    output_format,
                )
                content, content_type, filename = (
                    build_report_export(report)
                )

                self.assertEqual(
                    content_type,
                    expected[0],
                )
                self.assertTrue(
                    content.startswith(expected[1]),
                )
                self.assertTrue(
                    filename.endswith(
                        f".{output_format}"
                    )
                )

    def test_completed_report_download_endpoint(self):
        report = self.create_completed_report("pdf")

        self.client.force_authenticate(
            user=self.admin_user,
        )

        response = self.client.get(
            reverse(
                "reports:report-download",
                kwargs={
                    "pk": report.pk,
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response["Content-Type"],
            "application/pdf",
        )
        self.assertIn(
            "attachment;",
            response["Content-Disposition"],
        )
        self.assertTrue(
            response.content.startswith(b"%PDF"),
        )