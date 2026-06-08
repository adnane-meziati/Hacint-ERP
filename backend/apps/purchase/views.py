from rest_framework import viewsets

from common.permissions import IsReadOnlyForClient

from .filters import PurchaseOrderFilter, RFQFilter, VendorFilter
from .models import PurchaseOrder, Receipt, RFQ, Vendor
from .serializers import PurchaseOrderSerializer, ReceiptSerializer, RFQSerializer, VendorSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = VendorFilter
    search_fields = ["name", "code", "contact_email"]
    ordering_fields = ["name", "code", "created_at"]


class RFQViewSet(viewsets.ModelViewSet):
    queryset = RFQ.objects.select_related("vendor").prefetch_related("lines")
    serializer_class = RFQSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = RFQFilter
    search_fields = ["ref", "vendor__name", "vendor__code"]
    ordering_fields = ["ref", "created_at", "due_date"]


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related("vendor", "rfq").prefetch_related("lines")
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = PurchaseOrderFilter
    search_fields = ["ref", "vendor__name", "vendor__code"]
    ordering_fields = ["ref", "created_at", "expected_date"]


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.select_related("purchase_order__vendor").prefetch_related("lines")
    serializer_class = ReceiptSerializer
    permission_classes = [IsReadOnlyForClient]
    search_fields = ["purchase_order__ref"]
    ordering_fields = ["received_date", "created_at"]
