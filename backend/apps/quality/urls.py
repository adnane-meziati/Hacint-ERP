from rest_framework.routers import DefaultRouter

from .views import AuditViewSet, CAPAViewSet, InspectionViewSet, NonConformityViewSet

router = DefaultRouter()
router.register("v1/quality/inspections", InspectionViewSet, basename="quality-inspections")
router.register("v1/quality/ncrs", NonConformityViewSet, basename="quality-ncrs")
router.register("v1/quality/capas", CAPAViewSet, basename="quality-capas")
router.register("v1/quality/audits", AuditViewSet, basename="quality-audits")

urlpatterns = router.urls
