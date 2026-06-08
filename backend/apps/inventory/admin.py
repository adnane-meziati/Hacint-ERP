from django.contrib import admin

from .models import Item, Location, StockMovement, Warehouse


class LocationInline(admin.TabularInline):
    model = Location
    extra = 1


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["code", "name"]
    inlines = [LocationInline]


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["warehouse", "code", "location_type", "is_active"]
    list_filter = ["warehouse", "location_type", "is_active"]
    search_fields = ["code", "name"]


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ["sku", "name", "category", "unit_of_measure", "reorder_point", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["sku", "name"]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["item", "movement_type", "qty", "reference", "created_at"]
    list_filter = ["movement_type", "created_at"]
    search_fields = ["item__sku", "reference"]
    raw_id_fields = ["item", "from_location", "to_location"]
