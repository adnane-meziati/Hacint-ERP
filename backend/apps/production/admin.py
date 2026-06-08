from django.contrib import admin

from .models import ManufacturingOrder, Routing, Stage, StageEvent, WorkCenter


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "sequence", "is_active"]
    list_editable = ["sequence", "is_active"]
    ordering = ["sequence"]


@admin.register(StageEvent)
class StageEventAdmin(admin.ModelAdmin):
    list_display = ["line", "stage", "status", "started_at", "completed_at", "completed_by"]
    list_filter = ["status", "stage"]
    search_fields = ["line__order__n_ordre", "line__n_serie"]
    raw_id_fields = ["line"]


@admin.register(WorkCenter)
class WorkCenterAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "capacity_per_hour", "setup_time_minutes", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["code", "name"]


@admin.register(ManufacturingOrder)
class ManufacturingOrderAdmin(admin.ModelAdmin):
    list_display = ["ref", "work_center", "status", "planned_start", "planned_end", "qty_planned", "qty_produced"]
    list_filter = ["status", "work_center"]
    search_fields = ["ref"]
    raw_id_fields = ["sales_order_line", "bom"]


@admin.register(Routing)
class RoutingAdmin(admin.ModelAdmin):
    list_display = ["name", "work_center", "sequence", "standard_time_minutes"]
    list_filter = ["work_center"]
    search_fields = ["name"]
