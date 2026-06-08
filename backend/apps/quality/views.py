from rest_framework import viewsets

from common.permissions import IsReadOnlyForClient

from .filters import AuditFilter, CAPAFilter, InspectionFilter, NonConformityFilter
from .models import Audit, CAPA, Inspection, NonConformity
from .serializers import AuditSerializer, CAPASerializer, InspectionSerializer, NonConformitySerializer


class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.select_related("inspector").prefetch_related("lines")
    serializer_class = InspectionSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = InspectionFilter
    search_fields = ["ref", "sales_order_ref", "mo_ref"]
    ordering_fields = ["inspection_date", "created_at"]


class NonConformityViewSet(viewsets.ModelViewSet):
    queryset = NonConformity.objects.select_related("inspection").prefetch_related("capas__assigned_to")
    serializer_class = NonConformitySerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = NonConformityFilter
    search_fields = ["ref", "description"]
    ordering_fields = ["created_at"]


class CAPAViewSet(viewsets.ModelViewSet):
    queryset = CAPA.objects.select_related("ncr", "assigned_to")
    serializer_class = CAPASerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = CAPAFilter
    search_fields = ["description"]
    ordering_fields = ["due_date", "created_at"]


class AuditViewSet(viewsets.ModelViewSet):
    queryset = Audit.objects.all()
    serializer_class = AuditSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = AuditFilter
    search_fields = ["ref", "scope", "auditor"]
    ordering_fields = ["planned_date", "created_at"]
