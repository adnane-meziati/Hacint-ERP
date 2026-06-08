from rest_framework.routers import DefaultRouter

from .views import AccountViewSet, InvoiceViewSet, PaymentViewSet

router = DefaultRouter()
router.register("v1/finance/accounts", AccountViewSet, basename="finance-accounts")
router.register("v1/finance/invoices", InvoiceViewSet, basename="finance-invoices")
router.register("v1/finance/payments", PaymentViewSet, basename="finance-payments")

urlpatterns = router.urls
