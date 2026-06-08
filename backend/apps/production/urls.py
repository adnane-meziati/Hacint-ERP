from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ManufacturingOrderViewSet,
    QueueView,
    ReorderQueueView,
    RoutingViewSet,
    SendToStageView,
    StageBlockView,
    StageCompleteView,
    StageEventDetailView,
    StageListView,
    StageStartView,
    WorkCenterViewSet,
)
from .views_settings import StageCreateView, StageDetailView

router = DefaultRouter()
router.register(r"v1/manufacturing/work-centers", WorkCenterViewSet, basename="work-centers")
router.register(r"v1/manufacturing/orders", ManufacturingOrderViewSet, basename="manufacturing-orders")
router.register(r"v1/manufacturing/routings", RoutingViewSet, basename="routings")

urlpatterns = [
    path("", include(router.urls)),
    path("production/stages/", StageListView.as_view(), name="stages-list"),
    path("production/stages/create/", StageCreateView.as_view(), name="stages-create"),
    path("production/stages/<uuid:pk>/", StageDetailView.as_view(), name="stages-detail"),
    path("production/events/<uuid:pk>/", StageEventDetailView.as_view(), name="events-detail"),
    path("production/lines/<uuid:pk>/stages/<str:code>/start", StageStartView.as_view(), name="stage-start"),
    path("production/lines/<uuid:pk>/stages/<str:code>/complete", StageCompleteView.as_view(), name="stage-complete"),
    path("production/lines/<uuid:pk>/stages/<str:code>/block", StageBlockView.as_view(), name="stage-block"),
    path("queues/<str:stage_code>/", QueueView.as_view(), name="queue-detail"),
    path("production/lines/<uuid:pk>/send-to/", SendToStageView.as_view(), name="line-send-to"),
    path("planning/reorder/", ReorderQueueView.as_view(), name="planning-reorder"),
]
