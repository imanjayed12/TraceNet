from django.contrib import admin

from .models import District


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