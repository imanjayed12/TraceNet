from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    Alert,
    AlertRecipient,
)


User = get_user_model()


@transaction.atomic
def create_alert_with_recipients(
    *,
    alert_type,
    severity,
    title,
    message,
    created_by=None,
    case=None,
    hotspot=None,
    route=None,
    target_roles=None,
    explicit_users=None,
    expires_at=None,
):
    target_roles = list(
        dict.fromkeys(
            target_roles or [],
        )
    )
    explicit_users = explicit_users or []

    alert = Alert.objects.create(
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        case=case,
        hotspot=hotspot,
        route=route,
        target_roles=target_roles,
        created_by=created_by,
        expires_at=expires_at,
    )

    recipient_ids = set()

    if target_roles:
        role_user_ids = User.objects.filter(
            is_active=True,
            access_status=User.AccessStatus.APPROVED,
            role__in=target_roles,
        ).values_list(
            "id",
            flat=True,
        )

        recipient_ids.update(
            role_user_ids,
        )

    explicit_user_ids = User.objects.filter(
        id__in=[
            user.id
            for user in explicit_users
            if user and user.id
        ],
        is_active=True,
        access_status=User.AccessStatus.APPROVED,
    ).values_list(
        "id",
        flat=True,
    )

    recipient_ids.update(
        explicit_user_ids,
    )

    AlertRecipient.objects.bulk_create(
        [
            AlertRecipient(
                alert=alert,
                user_id=user_id,
            )
            for user_id in recipient_ids
        ],
        ignore_conflicts=True,
    )

    return alert