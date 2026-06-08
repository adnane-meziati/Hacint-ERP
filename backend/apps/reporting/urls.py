from rest_framework.routers import DefaultRouter

from .views import SavedReportViewSet, ScheduledReportViewSet

router = DefaultRouter()
router.register("v1/reporting/saved", SavedReportViewSet, basename="reporting-saved")
router.register("v1/reporting/scheduled", ScheduledReportViewSet, basename="reporting-scheduled")

urlpatterns = router.urls
