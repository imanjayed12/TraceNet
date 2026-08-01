from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Avg, Count, Sum
from django.utils import timezone

from alerts.models import Alert, AlertRecipient
from audit.models import AuditLog
from cases.models import Case
from locations.models import Hotspot, Route

from .models import Report


User = get_user_model()


def apply_date_range(
    queryset,
    *,
    field_name,
    date_from=None,
    date_to=None,
):
    filters = {}

    if date_from:
        filters[f"{field_name}__date__gte"] = date_from

    if date_to:
        filters[f"{field_name}__date__lte"] = date_to

    if filters:
        queryset = queryset.filter(**filters)

    return queryset


def grouped_counts(queryset, field_name):
    return list(
        queryset.values(field_name)
        .annotate(total=Count("id"))
        .order_by(field_name)
    )


def build_case_summary(report):
    cases = apply_date_range(
        Case.objects.all(),
        field_name="reported_at",
        date_from=report.date_from,
        date_to=report.date_to,
    )

    totals = cases.aggregate(
        total_cases=Count("id"),
        verified_cases=Count(
            "id",
            filter=models.Q(is_verified=True),
        ),
        total_victims=Sum("total_victims"),
        minor_victims=Sum("minor_victims"),
    )

    return {
        "total_cases": totals["total_cases"],
        "verified_cases": totals["verified_cases"],
        "total_victims": totals["total_victims"] or 0,
        "minor_victims": totals["minor_victims"] or 0,
        "by_status": grouped_counts(cases, "status"),
        "by_priority": grouped_counts(cases, "priority"),
        "by_category": grouped_counts(cases, "category"),
        "by_division": list(
            cases.values(
                "incident_district__division",
            )
            .annotate(total=Count("id"))
            .order_by("incident_district__division")
        ),
    }


def build_risk_summary(report):
    routes = apply_date_range(
        Route.objects.filter(is_active=True),
        field_name="created_at",
        date_from=report.date_from,
        date_to=report.date_to,
    )
    hotspots = apply_date_range(
        Hotspot.objects.filter(is_active=True),
        field_name="created_at",
        date_from=report.date_from,
        date_to=report.date_to,
    )

    hotspot_average = hotspots.aggregate(
        average=Avg("risk_score"),
    )["average"]

    return {
        "active_routes": routes.count(),
        "verified_routes": routes.filter(
            is_verified=True,
        ).count(),
        "routes_by_risk": grouped_counts(
            routes,
            "risk_level",
        ),
        "active_hotspots": hotspots.count(),
        "verified_hotspots": hotspots.filter(
            is_verified=True,
        ).count(),
        "average_hotspot_risk_score": (
            round(float(hotspot_average), 2)
            if hotspot_average is not None
            else 0
        ),
        "hotspots_by_risk": grouped_counts(
            hotspots,
            "risk_level",
        ),
        "hotspots_by_type": grouped_counts(
            hotspots,
            "hotspot_type",
        ),
    }


def build_alert_summary(report):
    alerts = apply_date_range(
        Alert.objects.all(),
        field_name="created_at",
        date_from=report.date_from,
        date_to=report.date_to,
    )
    recipients = AlertRecipient.objects.filter(
        alert__in=alerts,
    )

    return {
        "total_alerts": alerts.count(),
        "active_alerts": alerts.filter(
            status=Alert.Status.ACTIVE,
        ).count(),
        "alerts_by_severity": grouped_counts(
            alerts,
            "severity",
        ),
        "alerts_by_type": grouped_counts(
            alerts,
            "alert_type",
        ),
        "recipient_deliveries": recipients.count(),
        "read_deliveries": recipients.filter(
            is_read=True,
        ).count(),
        "acknowledged_deliveries": recipients.filter(
            is_acknowledged=True,
        ).count(),
    }


def build_compliance_summary(report):
    audit_logs = apply_date_range(
        AuditLog.objects.all(),
        field_name="created_at",
        date_from=report.date_from,
        date_to=report.date_to,
    )

    users = User.objects.all()

    return {
        "total_users": users.count(),
        "active_users": users.filter(
            is_active=True,
        ).count(),
        "users_by_role": grouped_counts(
            users,
            "role",
        ),
        "users_by_access_status": grouped_counts(
            users,
            "access_status",
        ),
        "total_audit_events": audit_logs.count(),
        "successful_events": audit_logs.filter(
            success=True,
        ).count(),
        "failed_events": audit_logs.filter(
            success=False,
        ).count(),
        "events_by_action": grouped_counts(
            audit_logs,
            "action",
        ),
    }


def build_report_summary(report):
    case_summary = build_case_summary(report)
    risk_summary = build_risk_summary(report)
    alert_summary = build_alert_summary(report)
    compliance_summary = build_compliance_summary(
        report,
    )

    if (
        report.report_type
        == Report.ReportType.CASE_ANALYSIS
    ):
        return {
            "cases": case_summary,
        }

    if (
        report.report_type
        == Report.ReportType.GEOGRAPHIC_RISK
    ):
        return {
            "risk": risk_summary,
            "case_geography": {
                "by_division": case_summary["by_division"],
            },
        }

    if (
        report.report_type
        == Report.ReportType.ROUTE_ANALYSIS
    ):
        return {
            "routes_and_hotspots": risk_summary,
        }

    if (
        report.report_type
        == Report.ReportType.ALERT_ANALYSIS
    ):
        return {
            "alerts": alert_summary,
        }

    if (
        report.report_type
        == Report.ReportType.AUDIT_COMPLIANCE
    ):
        return {
            "compliance": compliance_summary,
        }

    return {
        "cases": case_summary,
        "risk": risk_summary,
        "alerts": alert_summary,
        "compliance": compliance_summary,
    }


@transaction.atomic
def generate_report(report):
    report.status = Report.Status.PROCESSING
    report.error_message = ""
    report.save(
        update_fields=(
            "status",
            "error_message",
            "updated_at",
        )
    )

    try:
        report.summary = build_report_summary(report)
        report.status = Report.Status.COMPLETED
        report.generated_at = timezone.now()
        report.error_message = ""
        report.save(
            update_fields=(
                "summary",
                "status",
                "generated_at",
                "error_message",
                "updated_at",
            )
        )
    except Exception as error:
        report.status = Report.Status.FAILED
        report.error_message = str(error)[:1000]
        report.save(
            update_fields=(
                "status",
                "error_message",
                "updated_at",
            )
        )
        raise

    return report