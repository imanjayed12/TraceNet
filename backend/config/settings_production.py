"""Production-only settings for TraceNet.

Use with ``DJANGO_SETTINGS_MODULE=config.settings_production``.
Local development and automated tests continue to use their existing settings.
"""

import os

import dj_database_url

from .settings import *  # noqa: F401,F403


def env_bool(name, default=False):
    """Read a boolean environment variable using explicit true values."""
    default_value = "true" if default else "false"
    return (
        os.getenv(name, default_value).strip().lower()
        in {"1", "true", "yes", "on"}
    )


# Production must never expose Django debug pages.
DEBUG = False

# Neon supplies a secure PostgreSQL URL in production. Without DATABASE_URL,
# the base MySQL configuration remains available for local production checks.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=60,
            conn_health_checks=True,
            ssl_require=True,
        )
    }

# collectstatic writes assets here for the deployment web server or platform.
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise serves versioned, compressed static assets in production. Keep it
# immediately after Django's SecurityMiddleware.
MIDDLEWARE = MIDDLEWARE.copy()
MIDDLEWARE.insert(
    1,
    "whitenoise.middleware.WhiteNoiseMiddleware",
)

STORAGES = {
    "default": {
        "BACKEND": (
            "django.core.files.storage.FileSystemStorage"
        ),
    },
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage."
            "CompressedManifestStaticFilesStorage"
        ),
    },
}

# HTTPS and secure-cookie defaults. These settings apply only when this
# production module is selected, so localhost development remains unchanged.
SECURE_SSL_REDIRECT = env_bool(
    "DJANGO_SECURE_SSL_REDIRECT",
    True,
)
SESSION_COOKIE_SECURE = env_bool(
    "DJANGO_SESSION_COOKIE_SECURE",
    True,
)
CSRF_COOKIE_SECURE = env_bool(
    "DJANGO_CSRF_COOKIE_SECURE",
    True,
)

# Begin with one hour. Increase only after HTTPS and every required subdomain
# have been verified in production.
SECURE_HSTS_SECONDS = int(
    os.getenv("DJANGO_SECURE_HSTS_SECONDS", "3600")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    False,
)
SECURE_HSTS_PRELOAD = env_bool(
    "DJANGO_SECURE_HSTS_PRELOAD",
    False,
)

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
X_FRAME_OPTIONS = "DENY"

# Enable this only when the selected trusted reverse proxy strips incoming
# X-Forwarded-Proto and sets it itself for HTTPS requests.
if env_bool("DJANGO_TRUST_X_FORWARDED_PROTO", False):
    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )

# Brevo transactional email over HTTPS (Render Free blocks SMTP ports).
EMAIL_BACKEND = "config.brevo_email_backend.BrevoAPIEmailBackend"
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
BREVO_API_URL = os.getenv(
    "BREVO_API_URL",
    "https://api.brevo.com/v3/smtp/email",
).strip()
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "").strip()
BREVO_SENDER_NAME = os.getenv(
    "BREVO_SENDER_NAME",
    "TraceNet Security",
).strip()

if BREVO_SENDER_EMAIL:
    DEFAULT_FROM_EMAIL = (
        f"{BREVO_SENDER_NAME} <{BREVO_SENDER_EMAIL}>"
    )
