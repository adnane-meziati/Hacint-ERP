from rest_framework import viewsets

from common.permissions import IsReadOnlyForClient

from .models import BillOfMaterials, EngineeringChangeNotice
from .serializers import BOMSerializer, ECNSerializer


class BOMViewSet(viewsets.ModelViewSet):
    queryset = BillOfMaterials.objects.select_related("article").prefetch_related("lines__component")
    serializer_class = BOMSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_fields = ["status"]
    search_fields = ["article__ref_client", "revision"]
    ordering_fields = ["created_at"]


class ECNViewSet(viewsets.ModelViewSet):
    queryset = EngineeringChangeNotice.objects.select_related(
        "affected_bom__article", "requested_by", "approved_by"
    )
    serializer_class = ECNSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_fields = ["status", "priority"]
    search_fields = ["ref", "title", "description"]
    ordering_fields = ["created_at", "effective_date"]
