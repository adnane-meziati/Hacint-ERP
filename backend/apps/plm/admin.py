from django.contrib import admin

from .models import BillOfMaterials, BOMLine, EngineeringChangeNotice


class BOMLineInline(admin.TabularInline):
    model = BOMLine
    extra = 1


@admin.register(BillOfMaterials)
class BOMAdmin(admin.ModelAdmin):
    list_display = ["article", "revision", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["article__ref_client", "revision"]
    inlines = [BOMLineInline]


@admin.register(EngineeringChangeNotice)
class ECNAdmin(admin.ModelAdmin):
    list_display = ["ref", "title", "priority", "status", "requested_by", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["ref", "title"]
    raw_id_fields = ["requested_by", "approved_by", "affected_bom"]
