from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import generics, permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsReadOnlyForClient

from .filters import OrderFilter
from .models import Order, OrderLine
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderLineSerializer,
    OrderSerializer,
)


class OrderListCreateView(generics.ListCreateAPIView):
    """GET /api/orders/  POST /api/orders/"""

    permission_classes = [IsReadOnlyForClient]
    filterset_class = OrderFilter
    search_fields = ["n_ordre", "client__name", "lines__article__ref_client"]
    ordering_fields = ["n_ordre", "delivery_date", "created_at"]

    def get_queryset(self):  # type: ignore[override]
        return (
            Order.objects.select_related("client")
            .prefetch_related("lines")
            .filter(deleted_at__isnull=True)
        )

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/orders/{id}/"""

    permission_classes = [IsReadOnlyForClient]

    def get_queryset(self):  # type: ignore[override]
        return Order.objects.select_related("client").prefetch_related(
            "lines__article__family",
            "lines__current_stage",
            "lines__events__stage",
            "lines__events__completed_by",
        )

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return OrderSerializer
        return OrderDetailSerializer


class OrderPdfView(APIView):
    """GET /api/orders/{id}/pdf"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request, pk: str) -> HttpResponse:
        order = generics.get_object_or_404(
            Order.objects.select_related("client").prefetch_related(
                "lines__article", "lines__current_stage"
            ),
            pk=pk,
        )
        try:
            from weasyprint import HTML

            html = render_to_string("orders/order_pdf.html", {"order": order, "request": request})
            pdf = HTML(string=html, base_url=request.build_absolute_uri("/")).write_pdf()
            response = HttpResponse(pdf, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="OP_{order.n_ordre}.pdf"'
            return response
        except Exception:
            return HttpResponse("PDF generation requires WeasyPrint.", status=501)


class OrderLineDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/lines/{id}/"""

    serializer_class = OrderLineSerializer
    permission_classes = [IsReadOnlyForClient]

    def get_queryset(self):  # type: ignore[override]
        return OrderLine.objects.select_related(
            "article", "current_stage", "order__client"
        ).prefetch_related("events__stage", "events__completed_by")
