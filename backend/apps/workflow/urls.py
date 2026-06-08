from django.urls import path

from .views import (
    AdvanceApnStageView,
    ApnAttachmentCreateView,
    ApnAttachmentDeleteView,
    ApnDetailView,
    ApnListCreateView,
    ProjectDetailView,
    ProjectListCreateView,
    WorkflowOrderDetailView,
    WorkflowOrderListCreateView,
    WorkflowQueueView,
)

urlpatterns = [
    # Projects
    path("workflow/projects/", ProjectListCreateView.as_view(), name="wf-project-list"),
    path("workflow/projects/<uuid:pk>/", ProjectDetailView.as_view(), name="wf-project-detail"),
    # Orders (nested under project for creation, standalone for detail)
    path("workflow/projects/<uuid:pk>/orders/", WorkflowOrderListCreateView.as_view(), name="wf-order-list"),
    path("workflow/orders/<uuid:pk>/", WorkflowOrderDetailView.as_view(), name="wf-order-detail"),
    # APNs (nested under order for creation, standalone for detail)
    path("workflow/orders/<uuid:pk>/apns/", ApnListCreateView.as_view(), name="wf-apn-list"),
    path("workflow/apns/<uuid:pk>/", ApnDetailView.as_view(), name="wf-apn-detail"),
    path("workflow/apns/<uuid:pk>/advance/", AdvanceApnStageView.as_view(), name="wf-apn-advance"),
    path("workflow/apns/<uuid:pk>/attachments/", ApnAttachmentCreateView.as_view(), name="wf-apn-attach"),
    # Attachments standalone (for delete)
    path("workflow/attachments/<uuid:pk>/", ApnAttachmentDeleteView.as_view(), name="wf-attach-delete"),
    # Queue
    path("workflow/queue/<str:stage>/", WorkflowQueueView.as_view(), name="wf-queue"),
]
