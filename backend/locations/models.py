from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class District(models.Model):
    class Division(models.TextChoices):
        BARISHAL = "barishal", "Barishal"
        CHATTOGRAM = "chattogram", "Chattogram"
        DHAKA = "dhaka", "Dhaka"
        KHULNA = "khulna", "Khulna"
        MYMENSINGH = "mymensingh", "Mymensingh"
        RAJSHAHI = "rajshahi", "Rajshahi"
        RANGPUR = "rangpur", "Rangpur"
        SYLHET = "sylhet", "Sylhet"

    name = models.CharField(
        max_length=100,
        unique=True,
    )
    slug = models.SlugField(
        max_length=120,
        unique=True,
    )
    division = models.CharField(
        max_length=20,
        choices=Division.choices,
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(
                fields=("division", "name"),
            ),
            models.Index(
                fields=("is_active",),
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.get_division_display()}"


class Route(models.Model):
    class RouteType(models.TextChoices):
        DOMESTIC = "domestic", "Domestic"
        CROSS_BORDER = "cross_border", "Cross-border"

    class TransportMode(models.TextChoices):
        ROAD = "road", "Road"
        RAIL = "rail", "Rail"
        WATER = "water", "Water"
        AIR = "air", "Air"
        MIXED = "mixed", "Mixed"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    name = models.CharField(
        max_length=150,
        unique=True,
    )
    origin = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="outgoing_routes",
    )
    destination = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="incoming_routes",
    )
    route_type = models.CharField(
        max_length=20,
        choices=RouteType.choices,
        default=RouteType.DOMESTIC,
    )
    transport_mode = models.CharField(
        max_length=20,
        choices=TransportMode.choices,
        default=TransportMode.ROAD,
    )
    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.LOW,
    )
    description = models.TextField(
        blank=True,
    )
    evidence_summary = models.TextField(
        blank=True,
        help_text="Use anonymized or synthetic information only.",
    )
    is_verified = models.BooleanField(
        default=False,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_routes",
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
        ordering = (
            "-updated_at",
            "name",
        )
        indexes = [
            models.Index(
                fields=("origin", "destination"),
            ),
            models.Index(
                fields=("risk_level", "is_active"),
            ),
            models.Index(
                fields=("route_type", "is_active"),
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(
                    origin=models.F("destination"),
                ),
                name="route_origin_destination_different",
            ),
        ]

    def __str__(self):
        return (
            f"{self.name}: "
            f"{self.origin} → {self.destination}"
        )


class Hotspot(models.Model):
    class HotspotType(models.TextChoices):
        TRANSIT_HUB = "transit_hub", "Transit hub"
        BORDER_AREA = "border_area", "Border area"
        URBAN_CENTER = "urban_center", "Urban center"
        INDUSTRIAL_AREA = "industrial_area", "Industrial area"
        COASTAL_AREA = "coastal_area", "Coastal area"
        OTHER = "other", "Other"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    name = models.CharField(
        max_length=150,
        unique=True,
    )
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="hotspots",
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90),
        ],
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180),
        ],
    )
    hotspot_type = models.CharField(
        max_length=30,
        choices=HotspotType.choices,
        default=HotspotType.OTHER,
    )
    recent_case_count = models.PositiveIntegerField(
        default=0,
        help_text=(
            "Number of relevant cases in the configured recent period."
        ),
    )
    active_route_count = models.PositiveIntegerField(
        default=0,
    )
    verified_route_count = models.PositiveIntegerField(
        default=0,
    )
    vulnerability_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
        help_text=(
            "Context score from 0 to 100 using approved criteria."
        ),
    )
    risk_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
    )
    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.LOW,
    )
    risk_factors = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Transparent factor values and weights used in scoring."
        ),
    )
    risk_explanation = models.TextField(
        blank=True,
    )
    last_assessed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    is_verified = models.BooleanField(
        default=False,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_hotspots",
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
        ordering = (
            "-risk_score",
            "name",
        )
        indexes = [
            models.Index(
                fields=("district", "is_active"),
            ),
            models.Index(
                fields=("risk_level", "is_active"),
            ),
            models.Index(
                fields=("hotspot_type", "is_active"),
            ),
        ]

    def __str__(self):
        return (
            f"{self.name} "
            f"({self.get_risk_level_display()})"
        )