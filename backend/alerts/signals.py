from django.db.models.signals import (
    post_save,
    pre_save,
)
from django.dispatch import receiver

from cases.models import Case
from locations.models import (
    Hotspot,
    Route,
)

from .models import Alert
from .services import create_alert_with_recipients


OPERATIONAL_ROLES = [
    "admin",
    "police",
    "government",
]

INTELLIGENCE_ROLES = [
    "admin",
    "police",
    "government",
    "analyst",
]


def severity_from_risk(risk_level):
    if risk_level == "critical":
        return Alert.Severity.CRITICAL

    if risk_level == "high":
        return Alert.Severity.HIGH

    return Alert.Severity.WARNING


@receiver(pre_save, sender=Case)
def remember_previous_case_state(
    sender,
    instance,
    **kwargs,
):
    if not instance.pk:
        instance._previous_priority = None
        instance._previous_status = None
        return

    previous = Case.objects.filter(
        pk=instance.pk,
    ).values(
        "priority",
        "status",
    ).first()

    instance._previous_priority = (
        previous["priority"]
        if previous
        else None
    )
    instance._previous_status = (
        previous["status"]
        if previous
        else None
    )


@receiver(post_save, sender=Case)
def create_case_alert(
    sender,
    instance,
    created,
    **kwargs,
):
    priority_changed = (
        getattr(
            instance,
            "_previous_priority",
            None,
        )
        != instance.priority
    )
    status_changed = (
        getattr(
            instance,
            "_previous_status",
            None,
        )
        != instance.status
    )

    is_high_priority = instance.priority in {
        Case.Priority.HIGH,
        Case.Priority.CRITICAL,
    }

    requires_action = (
        instance.status
        == Case.Status.ACTION_REQUIRED
    )

    if created and is_high_priority:
        create_alert_with_recipients(
            alert_type=Alert.AlertType.CASE,
            severity=severity_from_risk(
                instance.priority,
            ),
            title=(
                f"High-priority case reported: "
                f"{instance.reference_code}"
            ),
            message=(
                "A high-priority anonymized case has "
                "been reported and requires review."
            ),
            created_by=instance.reported_by,
            case=instance,
            target_roles=OPERATIONAL_ROLES,
        )
        return

    if status_changed and requires_action:
        create_alert_with_recipients(
            alert_type=Alert.AlertType.CASE,
            severity=severity_from_risk(
                instance.priority,
            ),
            title=(
                f"Action required: "
                f"{instance.reference_code}"
            ),
            message=(
                "The case status changed to action "
                "required. Review the authorized case "
                "record immediately."
            ),
            created_by=instance.reported_by,
            case=instance,
            target_roles=OPERATIONAL_ROLES,
        )
        return

    if priority_changed and is_high_priority:
        create_alert_with_recipients(
            alert_type=Alert.AlertType.CASE,
            severity=severity_from_risk(
                instance.priority,
            ),
            title=(
                f"Case priority escalated: "
                f"{instance.reference_code}"
            ),
            message=(
                "An authorized case priority increased "
                "to a high operational risk level."
            ),
            created_by=instance.reported_by,
            case=instance,
            target_roles=OPERATIONAL_ROLES,
        )


@receiver(pre_save, sender=Route)
def remember_previous_route_state(
    sender,
    instance,
    **kwargs,
):
    if not instance.pk:
        instance._previous_risk_level = None
        instance._previous_is_verified = None
        return

    previous = Route.objects.filter(
        pk=instance.pk,
    ).values(
        "risk_level",
        "is_verified",
    ).first()

    instance._previous_risk_level = (
        previous["risk_level"]
        if previous
        else None
    )
    instance._previous_is_verified = (
        previous["is_verified"]
        if previous
        else None
    )


@receiver(post_save, sender=Route)
def create_route_alert(
    sender,
    instance,
    created,
    **kwargs,
):
    if not instance.is_active:
        return

    is_high_risk = instance.risk_level in {
        Route.RiskLevel.HIGH,
        Route.RiskLevel.CRITICAL,
    }

    risk_changed = (
        getattr(
            instance,
            "_previous_risk_level",
            None,
        )
        != instance.risk_level
    )
    became_verified = (
        instance.is_verified
        and not getattr(
            instance,
            "_previous_is_verified",
            False,
        )
    )

    if not is_high_risk:
        return

    if not (
        created
        or risk_changed
        or became_verified
    ):
        return

    create_alert_with_recipients(
        alert_type=Alert.AlertType.ROUTE,
        severity=severity_from_risk(
            instance.risk_level,
        ),
        title=f"High-risk route: {instance.name}",
        message=(
            "A synthetic or verified route reached a "
            "high risk level. Authorized teams should "
            "review the route intelligence."
        ),
        created_by=instance.created_by,
        route=instance,
        target_roles=INTELLIGENCE_ROLES,
    )


@receiver(pre_save, sender=Hotspot)
def remember_previous_hotspot_state(
    sender,
    instance,
    **kwargs,
):
    if not instance.pk:
        instance._previous_risk_level = None
        instance._previous_risk_score = None
        return

    previous = Hotspot.objects.filter(
        pk=instance.pk,
    ).values(
        "risk_level",
        "risk_score",
    ).first()

    instance._previous_risk_level = (
        previous["risk_level"]
        if previous
        else None
    )
    instance._previous_risk_score = (
        previous["risk_score"]
        if previous
        else None
    )


@receiver(post_save, sender=Hotspot)
def create_hotspot_alert(
    sender,
    instance,
    created,
    **kwargs,
):
    if not instance.is_active:
        return

    is_high_risk = instance.risk_level in {
        Hotspot.RiskLevel.HIGH,
        Hotspot.RiskLevel.CRITICAL,
    }

    risk_changed = (
        getattr(
            instance,
            "_previous_risk_level",
            None,
        )
        != instance.risk_level
        or getattr(
            instance,
            "_previous_risk_score",
            None,
        )
        != instance.risk_score
    )

    if not is_high_risk:
        return

    if not (
        created
        or risk_changed
    ):
        return

    create_alert_with_recipients(
        alert_type=Alert.AlertType.HOTSPOT,
        severity=severity_from_risk(
            instance.risk_level,
        ),
        title=f"High-risk hotspot: {instance.name}",
        message=(
            f"Hotspot risk assessment reached "
            f"{instance.risk_score}/100. Authorized "
            f"teams should review the anonymized "
            f"risk factors."
        ),
        created_by=instance.created_by,
        hotspot=instance,
        target_roles=INTELLIGENCE_ROLES,
    )