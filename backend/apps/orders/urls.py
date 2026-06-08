from django.urls import path

from .views import OrderDetailView, OrderLineDetailView, OrderListCreateView, OrderPdfView

urlpatterns = [
    path("orders/", OrderListCreateView.as_view(), name="orders-list"),
    path("orders/<uuid:pk>/", OrderDetailView.as_view(), name="orders-detail"),
    path("orders/<uuid:pk>/pdf", OrderPdfView.as_view(), name="orders-pdf"),
    path("lines/<uuid:pk>/", OrderLineDetailView.as_view(), name="lines-detail"),
]
