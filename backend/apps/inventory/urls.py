from rest_framework.routers import DefaultRouter

from .views import ItemViewSet, LocationViewSet, StockMovementViewSet, WarehouseViewSet

router = DefaultRouter()
router.register("v1/inventory/warehouses", WarehouseViewSet, basename="inventory-warehouses")
router.register("v1/inventory/locations", LocationViewSet, basename="inventory-locations")
router.register("v1/inventory/items", ItemViewSet, basename="inventory-items")
router.register("v1/inventory/movements", StockMovementViewSet, basename="inventory-movements")

urlpatterns = router.urls
