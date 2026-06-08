from django.urls import path

from .views import AttachmentCreateView, AttachmentListView

urlpatterns = [
    path("attachments/", AttachmentListView.as_view(), name="attachments-list"),
    path("attachments/upload/", AttachmentCreateView.as_view(), name="attachments-create"),
]
