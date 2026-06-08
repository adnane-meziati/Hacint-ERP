from rest_framework import viewsets

from common.permissions import IsReadOnlyForClient

from .models import SavedReport, ScheduledReport
from .serializers import SavedReportSerializer, ScheduledReportSerializer


class SavedReportViewSet(viewsets.ModelViewSet):
    queryset = SavedReport.objects.all()
    serializer_class = SavedReportSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_fields = ["module", "is_public"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


class ScheduledReportViewSet(viewsets.ModelViewSet):
    queryset = ScheduledReport.objects.select_related("saved_report")
    serializer_class = ScheduledReportSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_fields = ["is_active"]
    search_fields = ["saved_report__name"]
    ordering_fields = ["created_at"]
