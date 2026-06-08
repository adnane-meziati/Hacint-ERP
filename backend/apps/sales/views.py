from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsReadOnlyForClient

from .filters import CustomerFilter, QuoteFilter, SalesOrderFilter
from .models import Customer, Quote, SalesOrder
from .serializers import CustomerSerializer, QuoteSerializer, SalesOrderSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = CustomerFilter
    search_fields = ["name", "code", "contact_email"]
    ordering_fields = ["name", "code", "created_at"]


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.select_related("customer").prefetch_related("lines")
    serializer_class = QuoteSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = QuoteFilter
    search_fields = ["ref", "customer__name", "customer__code"]
    ordering_fields = ["ref", "created_at", "validity_date"]


class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.select_related("customer", "quote").prefetch_related("lines")
    serializer_class = SalesOrderSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = SalesOrderFilter
    search_fields = ["ref", "customer__name", "customer__code"]
    ordering_fields = ["ref", "created_at", "delivery_date"]
