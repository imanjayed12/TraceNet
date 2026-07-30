import uuid

from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.utils import timezone


def generate_case_reference():
    year = timezone.now().year
    unique_part = uuid.uuid4().hex[:8].upper()
    return f"TRN-{year}-{unique_part}"


class Case(models.Model):
    class Category(models.TextChoices):
        SUSPECTED = "suspected", "Suspected trafficking"
        CONFIRMED = "confirmed", "Confirmed trafficking"
        RESCUE = "rescue", "Rescue operation"
        ROUTE_INTELLIGENCE = (
            "route_intelligence",
            "Route intelligence",
        )
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        REPORTED = "reported", "Reported"
        UNDER_REVIEW = "under_review", "Under review"
        INVESTIGATING = "investigating", "Investigating"
        ACTION_REQUIRED = "action_required", "Action required"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Confidentiality(models.TextChoices):
        INTERNAL = "internal", "Internal"
        RESTRICTED = "restricted", "Restricted"
        HIGHLY_RESTRICTED = (
            "highly_restricted",
            "Highly restricted",
        )

    reference_code = models.CharField(
        max_length=25,
        unique=True,
        default=generate_case_reference,
        editable=False,
    )
    title = models.CharField(
        max_length=200,
    )
    summary = models.TextField(
        help_text=(
            "Use anonymized information only. Do not include "
            "names, phone numbers, NID numbers, or exact addresses."
        ),
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.SUSPECTED,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.REPORTED,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    confidentiality = models.CharField(
        max_length=30,
        choices=Confidentiality.choices,
        default=Confidentiality.RESTRICTED,
    )

    incident_district = models.ForeignKey(
        "locations.District",
        on_delete=models.PROTECT,
        related_name="cases",
    )
    location_description = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            "Use a general location description, not an exact address."
        ),
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90),
        ],
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180),
        ],
    )

    incident_date = models.DateField(
        null=True,
        blank=True,
    )
    total_victims = models.PositiveIntegerField(
        default=0,
    )
    minor_victims = models.PositiveIntegerField(
        default=0,
    )

    is_verified = models.BooleanField(
        default=False,
    )
    reported_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="reported_cases",
        null=True,
        blank=True,
    )
    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="assigned_cases",
        null=True,
        blank=True,
    )

    reported_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = (
            "-reported_at",
            "reference_code",
        )
        indexes = [
            models.Index(
                fields=("status", "priority"),
            ),
            models.Index(
                fields=("incident_district", "status"),
            ),
            models.Index(
                fields=("assigned_to", "status"),
            ),
            models.Index(
                fields=("category", "is_verified"),
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    minor_victims__lte=models.F(
                        "total_victims",
                    )
                ),
                name="case_minors_not_more_than_total",
            ),
        ]

    def __str__(self):
        return (
            f"{self.reference_code} — "
            f"{self.title}"
        )
class CaseUpdate(models.Model):
    class UpdateType(models.TextChoices):
        STATUS_CHANGE = "status_change", "Status change"
        NOTE = "note", "Investigation note"
        ASSIGNMENT = "assignment", "Assignment change"
        VERIFICATION = "verification", "Verification change"
        OTHER = "other", "Other"

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="updates",
    )
    update_type = models.CharField(
        max_length=30,
        choices=UpdateType.choices,
        default=UpdateType.NOTE,
    )
    previous_status = models.CharField(
        max_length=30,
        choices=Case.Status.choices,
        blank=True,
    )
    new_status = models.CharField(
        max_length=30,
        choices=Case.Status.choices,
        blank=True,
    )
    note = models.TextField(
        help_text=(
            "Use anonymized information only. "
            "Do not include identifying victim information."
        ),
    )
    is_internal = models.BooleanField(
        default=True,
    )
    changed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="case_updates",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(
                fields=("case", "created_at"),
            ),
            models.Index(
                fields=("update_type", "created_at"),
            ),
        ]

    def __str__(self):
        return (
            f"{self.case.reference_code} — "
            f"{self.get_update_type_display()}"
        )
class CaseRoute(models.Model):
    class RelationshipType(models.TextChoices):
        SUSPECTED = "suspected", "Suspected connection"
        CONFIRMED = "confirmed", "Confirmed connection"
        ORIGIN = "origin", "Origin point"
        TRANSIT = "transit", "Transit point"
        DESTINATION = "destination", "Destination point"

    class ConfidenceLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="route_links",
    )
    route = models.ForeignKey(
        "locations.Route",
        on_delete=models.PROTECT,
        related_name="case_links",
    )
    relationship_type = models.CharField(
        max_length=20,
        choices=RelationshipType.choices,
        default=RelationshipType.SUSPECTED,
    )
    confidence_level = models.CharField(
        max_length=20,
        choices=ConfidenceLevel.choices,
        default=ConfidenceLevel.LOW,
    )
    evidence_note = models.TextField(
        blank=True,
        help_text=(
            "Use anonymized evidence only. "
            "Do not include personal identifiers."
        ),
    )
    linked_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="case_route_links",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("case", "route"),
                name="unique_case_route_link",
            ),
        ]
        indexes = [
            models.Index(
                fields=("case", "relationship_type"),
            ),
            models.Index(
                fields=("route", "confidence_level"),
            ),
        ]

    def __str__(self):
        return (
            f"{self.case.reference_code} ↔ "
            f"{self.route.name}"
        )
def generate_victim_code():
    unique_part = uuid.uuid4().hex[:10].upper()
    return f"VIC-{unique_part}"


class VictimProfile(models.Model):
    class AgeGroup(models.TextChoices):
        CHILD = "child", "Child (0–11)"
        ADOLESCENT = "adolescent", "Adolescent (12–17)"
        ADULT = "adult", "Adult (18+)"
        UNKNOWN = "unknown", "Unknown"

    class Gender(models.TextChoices):
        FEMALE = "female", "Female"
        MALE = "male", "Male"
        OTHER = "other", "Other"
        UNKNOWN = "unknown", "Unknown"

    class ExploitationType(models.TextChoices):
        LABOUR = "labour", "Forced labour"
        SEXUAL = "sexual", "Sexual exploitation"
        FORCED_MARRIAGE = "forced_marriage", "Forced marriage"
        DOMESTIC_SERVITUDE = (
            "domestic_servitude",
            "Domestic servitude",
        )
        ORGAN_REMOVAL = "organ_removal", "Organ removal"
        OTHER = "other", "Other"
        UNKNOWN = "unknown", "Unknown"

    class SupportStatus(models.TextChoices):
        IDENTIFIED = "identified", "Identified"
        RESCUED = "rescued", "Rescued"
        REFERRED = "referred", "Referred for support"
        RECEIVING_SUPPORT = (
            "receiving_support",
            "Receiving support",
        )
        REINTEGRATING = "reintegrating", "Reintegrating"
        UNKNOWN = "unknown", "Unknown"

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="victim_profiles",
    )
    anonymous_code = models.CharField(
        max_length=20,
        unique=True,
        default=generate_victim_code,
        editable=False,
    )
    age_group = models.CharField(
        max_length=20,
        choices=AgeGroup.choices,
        default=AgeGroup.UNKNOWN,
    )
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        default=Gender.UNKNOWN,
    )
    exploitation_type = models.CharField(
        max_length=30,
        choices=ExploitationType.choices,
        default=ExploitationType.UNKNOWN,
    )
    support_status = models.CharField(
        max_length=30,
        choices=SupportStatus.choices,
        default=SupportStatus.IDENTIFIED,
    )
    country_of_origin = models.CharField(
        max_length=100,
        blank=True,
        help_text=(
            "Country-level information only; "
            "do not enter an exact address."
        ),
    )
    support_needs = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Use general categories such as medical, legal, "
            "shelter, counselling, or family support."
        ),
    )
    protected_note = models.TextField(
        blank=True,
        help_text=(
            "Do not include names, contact details, ID numbers, "
            "photos, or exact addresses."
        ),
    )
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="recorded_victim_profiles",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("anonymous_code",)
        indexes = [
            models.Index(
                fields=("case", "support_status"),
            ),
            models.Index(
                fields=("age_group", "exploitation_type"),
            ),
        ]

    def __str__(self):
        return (
            f"{self.anonymous_code} — "
            f"{self.case.reference_code}"
        )