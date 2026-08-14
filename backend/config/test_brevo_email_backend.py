import json
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage, get_connection
from django.test import SimpleTestCase, override_settings


class _SuccessfulResponse:
    status = 201

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def getcode(self):
        return self.status


@override_settings(
    BREVO_API_KEY="test-api-key",
    BREVO_API_URL="https://api.brevo.com/v3/smtp/email",
    BREVO_SENDER_EMAIL="security@example.com",
    BREVO_SENDER_NAME="TraceNet Security",
)
class BrevoAPIEmailBackendTests(SimpleTestCase):
    @patch(
        "config.brevo_email_backend.urlopen",
        return_value=_SuccessfulResponse(),
    )
    def test_sends_expected_https_request(self, mocked_urlopen):
        connection = get_connection(
            backend="config.brevo_email_backend.BrevoAPIEmailBackend"
        )
        message = EmailMessage(
            subject="Reset your TraceNet password",
            body="Use the secure reset link.",
            from_email="ignored@example.com",
            to=["User Name <user@example.com>"],
            connection=connection,
        )

        self.assertEqual(message.send(), 1)
        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))

        self.assertEqual(request.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(payload["sender"]["email"], "security@example.com")
        self.assertEqual(payload["to"][0]["email"], "user@example.com")
        self.assertEqual(payload["subject"], "Reset your TraceNet password")
        self.assertEqual(mocked_urlopen.call_args.kwargs["timeout"], 20)

    @override_settings(BREVO_API_KEY="")
    def test_missing_key_raises_when_not_silent(self):
        connection = get_connection(
            backend="config.brevo_email_backend.BrevoAPIEmailBackend",
            fail_silently=False,
        )
        message = EmailMessage(
            subject="Test",
            body="Test",
            to=["user@example.com"],
            connection=connection,
        )

        with self.assertRaises(ImproperlyConfigured):
            message.send()

    @override_settings(BREVO_API_KEY="")
    def test_missing_key_is_silent_when_requested(self):
        connection = get_connection(
            backend="config.brevo_email_backend.BrevoAPIEmailBackend",
            fail_silently=True,
        )
        message = EmailMessage(
            subject="Test",
            body="Test",
            to=["user@example.com"],
            connection=connection,
        )

        self.assertEqual(message.send(), 0)
