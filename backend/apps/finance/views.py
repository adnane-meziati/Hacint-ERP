from rest_framework import viewsets

from common.permissions import IsReadOnlyForClient

from .filters import InvoiceFilter, PaymentFilter
from .models import Account, Invoice, Payment
from .serializers import AccountSerializer, InvoiceSerializer, PaymentSerializer


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_fields = ["account_type", "currency", "is_active"]
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name"]


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("customer", "vendor").prefetch_related("lines", "payments")
    serializer_class = InvoiceSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = InvoiceFilter
    search_fields = ["ref"]
    ordering_fields = ["issue_date", "due_date", "created_at"]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("invoice")
    serializer_class = PaymentSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = PaymentFilter
    search_fields = ["reference", "invoice__ref"]
    ordering_fields = ["payment_date", "created_at"]
