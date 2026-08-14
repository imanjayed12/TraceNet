"""Django email backend for Brevo's transactional HTTPS API."""

from __future__ import annotations

import json
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend


def _brevo_address(value):
    name, address = parseaddr(value or "")
    recipient = {"email": address}
    if name:
        recipient["name"] = name
    return recipient


class BrevoAPIEmailBackend(BaseEmailBackend):
    """Send Django email messages through Brevo without using SMTP ports."""

    request_timeout = 20

    def _configuration(self):
        api_key = getattr(settings, "BREVO_API_KEY", "").strip()
        sender_email = getattr(settings, "BREVO_SENDER_EMAIL", "").strip()
        sender_name = getattr(
            settings,
            "BREVO_SENDER_NAME",
            "TraceNet Security",
        ).strip()
        api_url = getattr(
            settings,
            "BREVO_API_URL",
            "https://api.brevo.com/v3/smtp/email",
        ).strip()

        missing = []
        if not api_key:
            missing.append("BREVO_API_KEY")
        if not sender_email:
            missing.append("BREVO_SENDER_EMAIL")
        if not api_url:
            missing.append("BREVO_API_URL")
        if missing:
            raise ImproperlyConfigured(
                "Missing Brevo email configuration: " + ", ".join(missing)
            )

        return api_key, api_url, sender_email, sender_name

    @staticmethod
    def _recipients(values):
        recipients = []
        for value in values or []:
            recipient = _brevo_address(value)
            if recipient["email"]:
                recipients.append(recipient)
        return recipients

    def _payload(self, message, sender_email, sender_name):
        payload = {
            "sender": {
                "email": sender_email,
                "name": sender_name,
            },
            "to": self._recipients(message.to),
            "subject": message.subject or "",
            "textContent": message.body or "",
        }

        cc = self._recipients(message.cc)
        bcc = self._recipients(message.bcc)
        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc

        reply_to = self._recipients(message.reply_to)
        if reply_to:
            payload["replyTo"] = reply_to[0]

        for alternative in getattr(message, "alternatives", ()):
            content = getattr(alternative, "content", alternative[0])
            mimetype = getattr(alternative, "mimetype", alternative[1])
            if mimetype == "text/html":
                payload["htmlContent"] = content
                break

        return payload

    def send_messages(self, email_messages):
        messages = list(email_messages or [])
        if not messages:
            return 0

        try:
            api_key, api_url, sender_email, sender_name = self._configuration()
        except Exception:
            if self.fail_silently:
                return 0
            raise

        sent_count = 0
        for message in messages:
            if not message.recipients() or not message.to:
                continue

            payload = self._payload(message, sender_email, sender_name)
            request = Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "accept": "application/json",
                    "api-key": api_key,
                    "content-type": "application/json",
                },
                method="POST",
            )

            try:
                with urlopen(request, timeout=self.request_timeout) as response:
                    status_code = getattr(response, "status", response.getcode())
                    if not 200 <= status_code < 300:
                        raise RuntimeError(
                            f"Brevo email API returned HTTP {status_code}."
                        )
                sent_count += 1
            except (HTTPError, URLError, OSError, RuntimeError):
                if not self.fail_silently:
                    raise

        return sent_count
