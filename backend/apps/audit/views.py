from rest_framework import generics

from common.permissions import IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """GET /api/audit/?entity=order&object_id=<uuid>"""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):  # type: ignore[override]
        qs = AuditLog.objects.select_related("user", "content_type")
        entity = self.request.query_params.get("entity", "")
        object_id = self.request.query_params.get("object_id", "")
        if entity:
            qs = qs.filter(content_type__model=entity.lower())
        if object_id:
            qs = qs.filter(object_id=object_id)
        return qs
