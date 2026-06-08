from rest_framework.routers import DefaultRouter

from .views import BOMViewSet, ECNViewSet

router = DefaultRouter()
router.register("v1/plm/boms", BOMViewSet, basename="plm-boms")
router.register("v1/plm/ecns", ECNViewSet, basename="plm-ecns")

urlpatterns = router.urls
