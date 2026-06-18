from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    InstallationProjectViewSet,
    InstallationProductViewSet,
    InstallationTaskViewSet,
    InstallationDocumentViewSet,
    InstallationReportViewSet,
    InstallationNotificationViewSet,
    InstallationDashboardViewSet,
    export_installation,
)

router = DefaultRouter()
router.register('projects', InstallationProjectViewSet, basename='installation-project')
router.register('products', InstallationProductViewSet, basename='installation-product')
router.register('tasks', InstallationTaskViewSet, basename='installation-task')
router.register('documents', InstallationDocumentViewSet, basename='installation-document')
router.register('reports', InstallationReportViewSet, basename='installation-report')
router.register('notifications', InstallationNotificationViewSet, basename='installation-notification')
router.register('dashboard', InstallationDashboardViewSet, basename='installation-dashboard')

urlpatterns = [
    path('export/<str:resource>/<str:fmt>/', export_installation, name='installation-export'),
    path('', include(router.urls)),
]
