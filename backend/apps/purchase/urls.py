from rest_framework.routers import DefaultRouter

from .views import PurchaseOrderViewSet, ReceiptViewSet, RFQViewSet, VendorViewSet

router = DefaultRouter()
router.register("v1/purchase/vendors", VendorViewSet, basename="purchase-vendors")
router.register("v1/purchase/rfqs", RFQViewSet, basename="purchase-rfqs")
router.register("v1/purchase/orders", PurchaseOrderViewSet, basename="purchase-orders")
router.register("v1/purchase/receipts", ReceiptViewSet, basename="purchase-receipts")

urlpatterns = router.urls
