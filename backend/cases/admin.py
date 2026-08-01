from django.contrib import admin

from .models import (
    Case,
    CaseAccessGrant,
    CaseRoute,
    CaseUpdate,
    EmergencyAccessInvitation,
    VictimProfile,
)


class CaseUpdateInline(admin.TabularInline):
    model = CaseUpdate
    extra = 0
    autocomplete_fields = (
        "changed_by",
    )
    readonly_fields = (
        "created_at",
    )
    fields = (
        "update_type",
        "previous_status",
        "new_status",
        "note",
        "is_internal",
        "changed_by",
        "created_at",
    )


class CaseRouteInline(admin.TabularInline):
    model = CaseRoute
    extra = 0
    autocomplete_fields = (
        "route",
        "linked_by",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    fields = (
        "route",
        "relationship_type",
        "confidence_level",
        "evidence_note",
        "linked_by",
        "created_at",
    )


class VictimProfileInline(admin.TabularInline):
    model = VictimProfile
    extra = 0
    autocomplete_fields = (
        "recorded_by",
    )
    readonly_fields = (
        "anonymous_code",
        "created_at",
    )
    fields = (
        "anonymous_code",
        "age_group",
        "gender",
        "exploitation_type",
        "support_status",
        "recorded_by",
        "created_at",
    )


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        "reference_code",
        "title",
        "incident_district",
        "category",
        "status",
        "priority",
        "total_victims",
        "is_verified",
        "assigned_to",
        "updated_at",
    )

    list_filter = (
        "category",
        "status",
        "priority",
        "confidentiality",
        "is_verified",
        "incident_district__division",
    )

    search_fields = (
        "reference_code",
        "title",
        "summary",
        "incident_district__name",
    )

    autocomplete_fields = (
        "incident_district",
        "reported_by",
        "assigned_to",
    )

    readonly_fields = (
        "reference_code",
        "reported_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Case identity",
            {
                "fields": (
                    "reference_code",
                    "title",
                    "category",
                    "status",
                    "priority",
                    "confidentiality",
                    "is_verified",
                )
            },
        ),
        (
            "Anonymized case information",
            {
                "fields": (
                    "summary",
                    "incident_district",
                    "location_description",
                    "latitude",
                    "longitude",
                    "incident_date",
                )
            },
        ),
        (
            "Victim summary",
            {
                "fields": (
                    "total_victims",
                    "minor_victims",
                )
            },
        ),
        (
            "Assignment",
            {
                "fields": (
                    "reported_by",
                    "assigned_to",
                    "reported_at",
                    "updated_at",
                    "resolved_at",
                )
            },
        ),
    )

    inlines = (
        CaseUpdateInline,
        CaseRouteInline,
        VictimProfileInline,
    )

    ordering = (
        "-reported_at",
    )
    list_per_page = 25


@admin.register(CaseUpdate)
class CaseUpdateAdmin(admin.ModelAdmin):
    list_display = (
        "case",
        "update_type",
        "previous_status",
        "new_status",
        "changed_by",
        "is_internal",
        "created_at",
    )

    list_filter = (
        "update_type",
        "new_status",
        "is_internal",
    )

    search_fields = (
        "case__reference_code",
        "case__title",
        "note",
    )

    autocomplete_fields = (
        "case",
        "changed_by",
    )

    readonly_fields = (
        "created_at",
    )

    ordering = (
        "-created_at",
    )


@admin.register(CaseRoute)
class CaseRouteAdmin(admin.ModelAdmin):
    list_display = (
        "case",
        "route",
        "relationship_type",
        "confidence_level",
        "linked_by",
        "created_at",
    )

    list_filter = (
        "relationship_type",
        "confidence_level",
    )

    search_fields = (
        "case__reference_code",
        "case__title",
        "route__name",
        "evidence_note",
    )

    autocomplete_fields = (
        "case",
        "route",
        "linked_by",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(VictimProfile)
class VictimProfileAdmin(admin.ModelAdmin):
    list_display = (
        "anonymous_code",
        "case",
        "age_group",
        "gender",
        "exploitation_type",
        "support_status",
        "recorded_by",
        "updated_at",
    )

    list_filter = (
        "age_group",
        "gender",
        "exploitation_type",
        "support_status",
    )

    search_fields = (
        "anonymous_code",
        "case__reference_code",
        "case__title",
    )

    autocomplete_fields = (
        "case",
        "recorded_by",
    )

    readonly_fields = (
        "anonymous_code",
        "created_at",
        "updated_at",
    )

    ordering = (
        "anonymous_code",
    )

@admin.register(EmergencyAccessInvitation)
class EmergencyAccessInvitationAdmin(admin.ModelAdmin):
    list_display = (
        "token",
        "case",
        "invitee_email",
        "sponsor",
        "status",
        "expires_at",
        "accepted_by",
        "created_at",
    )

    list_filter = (
        "status",
        "expires_at",
        "created_at",
    )

    search_fields = (
        "token",
        "case__reference_code",
        "case__title",
        "invitee_email",
        "sponsor__email",
        "accepted_by__email",
    )

    autocomplete_fields = (
        "case",
        "sponsor",
        "accepted_by",
    )

    readonly_fields = (
        "token",
        "accepted_at",
        "revoked_at",
        "created_at",
    )

    ordering = (
        "-created_at",
    )


@admin.register(CaseAccessGrant)
class CaseAccessGrantAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "case",
        "access_level",
        "is_active",
        "expires_at",
        "granted_by",
        "created_at",
    )

    list_filter = (
        "access_level",
        "is_active",
        "expires_at",
    )

    search_fields = (
        "user__email",
        "case__reference_code",
        "case__title",
        "invitation__token",
        "granted_by__email",
    )

    autocomplete_fields = (
        "case",
        "user",
        "invitation",
        "granted_by",
        "revoked_by",
    )

    readonly_fields = (
        "created_at",
        "revoked_at",
    )

    ordering = (
        "-created_at",
    )