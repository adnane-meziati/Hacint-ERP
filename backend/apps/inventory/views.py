from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsReadOnlyForClient

from .filters import ItemFilter, StockMovementFilter
from .models import Item, Location, StockMovement, Warehouse
from .serializers import ItemSerializer, LocationSerializer, StockMovementSerializer, WarehouseSerializer


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.prefetch_related("locations")
    serializer_class = WarehouseSerializer
    permission_classes = [IsReadOnlyForClient]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code"]


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.select_related("warehouse")
    serializer_class = LocationSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_fields = ["warehouse", "location_type", "is_active"]
    search_fields = ["code", "name"]


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = ItemFilter
    search_fields = ["sku", "name", "category"]
    ordering_fields = ["sku", "name", "created_at"]

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):  # type: ignore[override]
        items = [item for item in self.get_queryset() if item.is_low_stock]
        serializer = self.get_serializer(items, many=True)
        return Response({"count": len(items), "results": serializer.data})


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related("item", "from_location", "to_location")
    serializer_class = StockMovementSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = StockMovementFilter
    search_fields = ["item__sku", "reference"]
    ordering_fields = ["created_at"]
