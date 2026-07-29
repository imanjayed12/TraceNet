from django.contrib import admin

from .models import District, Hotspot, Route


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "division",
        "latitude",
        "longitude",
        "is_active",
        "updated_at",
    )

    list_filter = (
        "division",
        "is_active",
    )

    search_fields = (
        "name",
        "slug",
    )

    prepopulated_fields = {
        "slug": ("name",),
    }

    ordering = ("name",)
    list_per_page = 25


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "origin",
        "destination",
        "route_type",
        "transport_mode",
        "risk_level",
        "is_verified",
        "is_active",
        "updated_at",
    )

    list_filter = (
        "route_type",
        "transport_mode",
        "risk_level",
        "is_verified",
        "is_active",
    )

    search_fields = (
        "name",
        "origin__name",
        "destination__name",
        "description",
    )

    autocomplete_fields = (
        "origin",
        "destination",
        "created_by",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-updated_at",)
    list_per_page = 25


@admin.register(Hotspot)
class HotspotAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "district",
        "hotspot_type",
        "risk_score",
        "risk_level",
        "recent_case_count",
        "is_verified",
        "is_active",
        "updated_at",
    )

    list_filter = (
        "hotspot_type",
        "risk_level",
        "is_verified",
        "is_active",
        "district__division",
    )

    search_fields = (
        "name",
        "district__name",
        "risk_explanation",
    )

    autocomplete_fields = (
        "district",
        "created_by",
    )

    readonly_fields = (
        "risk_score",
        "risk_level",
        "risk_factors",
        "risk_explanation",
        "last_assessed_at",
        "created_at",
        "updated_at",
    )

    ordering = (
        "-risk_score",
        "name",
    )
    list_per_page = 25