from rest_framework import serializers

from .models import Item, Location, StockMovement, Warehouse


class WarehouseSerializer(serializers.ModelSerializer):
    location_count = serializers.IntegerField(source="locations.count", read_only=True)

    class Meta:
        model = Warehouse
        fields = ["id", "name", "code", "address", "is_active", "location_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class LocationSerializer(serializers.ModelSerializer):
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)

    class Meta:
        model = Location
        fields = ["id", "warehouse", "warehouse_code", "code", "name", "location_type", "is_active"]
        read_only_fields = ["id"]


class ItemSerializer(serializers.ModelSerializer):
    current_stock = serializers.FloatField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Item
        fields = [
            "id", "sku", "name", "description", "category", "unit_of_measure",
            "reorder_point", "lead_time_days", "unit_cost", "is_active",
            "current_stock", "is_low_stock", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    from_location_name = serializers.CharField(source="from_location.name", read_only=True, default=None)
    to_location_name = serializers.CharField(source="to_location.name", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = [
            "id", "item", "item_sku", "item_name",
            "from_location", "from_location_name",
            "to_location", "to_location_name",
            "qty", "movement_type", "reference", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
