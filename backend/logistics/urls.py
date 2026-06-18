from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DeliveryOrderViewSet,
    DriverViewSet,
    LogisticsDashboardView,
    LogisticsNotificationViewSet,
    LogisticsReportViewSet,
    LogisticsReportJournalViewSet,
    LogisticsTaskAttachmentViewSet,
    LogisticsTaskCommentViewSet,
    LogisticsTaskHistoryViewSet,
    LogisticsTaskViewSet,
    ShipmentViewSet,
    VehicleViewSet,
    WarehouseTransferViewSet,
)


router = DefaultRouter()

router.register(
    r'vehicles',
    VehicleViewSet,
    basename='logistics-vehicle',
)
router.register(
    r'drivers',
    DriverViewSet,
    basename='logistics-driver',
)
router.register(
    r'delivery-orders',
    DeliveryOrderViewSet,
    basename='logistics-delivery-order',
)
router.register(
    r'shipments',
    ShipmentViewSet,
    basename='logistics-shipment',
)
router.register(
    r'warehouse-transfers',
    WarehouseTransferViewSet,
    basename='logistics-warehouse-transfer',
)
router.register(
    r'tasks',
    LogisticsTaskViewSet,
    basename='logistics-task',
)
router.register(
    r'task-comments',
    LogisticsTaskCommentViewSet,
    basename='logistics-task-comment',
)
router.register(
    r'task-attachments',
    LogisticsTaskAttachmentViewSet,
    basename='logistics-task-attachment',
)
router.register(
    r'task-history',
    LogisticsTaskHistoryViewSet,
    basename='logistics-task-history',
)
router.register(
    r'notifications',
    LogisticsNotificationViewSet,
    basename='logistics-notification',
)
router.register(
    r'reports',
    LogisticsReportViewSet,
    basename='logistics-report',
)
router.register(
    r'report-journal',
    LogisticsReportJournalViewSet,
    basename='logistics-report-journal',
)


urlpatterns = [
    path('', include(router.urls)),
    path(
        'dashboard/',
        LogisticsDashboardView.as_view({'get': 'dashboard'}),
        name='logistics-dashboard',
    ),
]
