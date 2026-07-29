from django.contrib import admin

from .models import District, Route


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