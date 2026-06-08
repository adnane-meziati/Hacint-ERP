from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, QuoteViewSet, SalesOrderViewSet

router = DefaultRouter()
router.register("v1/sales/customers", CustomerViewSet, basename="sales-customers")
router.register("v1/sales/quotes", QuoteViewSet, basename="sales-quotes")
router.register("v1/sales/orders", SalesOrderViewSet, basename="sales-orders")

urlpatterns = router.urls
