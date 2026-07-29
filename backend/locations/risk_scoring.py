RULE_VERSION = "rule-v1"
RECENT_PERIOD_DAYS = 90


def calculate_hotspot_risk(
    recent_case_count,
    active_route_count,
    verified_route_count,
    vulnerability_score,
):
    values = {
        "recent_case_count": recent_case_count,
        "active_route_count": active_route_count,
        "verified_route_count": verified_route_count,
        "vulnerability_score": vulnerability_score,
    }

    for field_name, value in values.items():
        if value < 0:
            raise ValueError(
                f"{field_name} cannot be negative."
            )

    if vulnerability_score > 100:
        raise ValueError(
            "vulnerability_score cannot exceed 100."
        )

    if verified_route_count > active_route_count:
        raise ValueError(
            "verified_route_count cannot exceed active_route_count."
        )

    unverified_route_count = (
        active_route_count - verified_route_count
    )

    recent_case_contribution = min(
        recent_case_count * 10,
        40,
    )
    unverified_route_contribution = min(
        unverified_route_count * 4,
        16,
    )
    verified_route_contribution = min(
        verified_route_count * 8,
        24,
    )
    vulnerability_contribution = min(
        round(vulnerability_score * 0.20),
        20,
    )

    risk_score = min(
        recent_case_contribution
        + unverified_route_contribution
        + verified_route_contribution
        + vulnerability_contribution,
        100,
    )

    if risk_score >= 75:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"

    risk_factors = {
        "rule_version": RULE_VERSION,
        "recent_period_days": RECENT_PERIOD_DAYS,
        "inputs": {
            "recent_case_count": recent_case_count,
            "active_route_count": active_route_count,
            "verified_route_count": verified_route_count,
            "unverified_route_count": unverified_route_count,
            "vulnerability_score": vulnerability_score,
        },
        "contributions": {
            "recent_cases": recent_case_contribution,
            "unverified_routes": unverified_route_contribution,
            "verified_routes": verified_route_contribution,
            "vulnerability": vulnerability_contribution,
        },
        "maximum_contributions": {
            "recent_cases": 40,
            "unverified_routes": 16,
            "verified_routes": 24,
            "vulnerability": 20,
        },
    }

    risk_explanation = (
        f"Rule {RULE_VERSION}: recent cases contributed "
        f"{recent_case_contribution}/40, unverified routes "
        f"{unverified_route_contribution}/16, verified routes "
        f"{verified_route_contribution}/24, and vulnerability "
        f"{vulnerability_contribution}/20. Final score: "
        f"{risk_score}/100 ({risk_level})."
    )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "risk_explanation": risk_explanation,
    }