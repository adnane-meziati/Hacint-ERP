from django.contrib import admin

from .models import Audit, CAPA, Inspection, InspectionLine, NonConformity


class InspectionLineInline(admin.TabularInline):
    model = InspectionLine
    extra = 1


class CAPAInline(admin.TabularInline):
    model = CAPA
    extra = 0


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ["ref", "inspector", "status", "inspection_date", "created_at"]
    list_filter = ["status", "inspection_date"]
    search_fields = ["ref"]
    inlines = [InspectionLineInline]


@admin.register(NonConformity)
class NonConformityAdmin(admin.ModelAdmin):
    list_display = ["ref", "severity", "status", "created_at"]
    list_filter = ["severity", "status"]
    search_fields = ["ref", "description"]
    inlines = [CAPAInline]


@admin.register(CAPA)
class CAPAAdmin(admin.ModelAdmin):
    list_display = ["id", "ncr", "action_type", "assigned_to", "due_date", "status"]
    list_filter = ["action_type", "status"]
    search_fields = ["description"]


@admin.register(Audit)
class AuditAdmin(admin.ModelAdmin):
    list_display = ["ref", "audit_type", "auditor", "planned_date", "status"]
    list_filter = ["audit_type", "status"]
    search_fields = ["ref", "auditor", "scope"]
