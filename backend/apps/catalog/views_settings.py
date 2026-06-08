"""Admin-only CRUD views for reference data (families, clients)."""

from rest_framework import generics, permissions
from rest_framework.parsers import FormParser, MultiPartParser

from common.permissions import IsAdmin

from .models import Client, Family
from .serializers import ClientSerializer, FamilySerializer


class ClientAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/clients/{id}/ — admin only."""

    serializer_class = ClientSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]
    queryset = Client.objects.all()


class FamilyCreateView(generics.CreateAPIView):
    """POST /api/families/ — admin only."""

    serializer_class = FamilySerializer
    permission_classes = [IsAdmin]


class FamilyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/families/{id}/ — admin only."""

    serializer_class = FamilySerializer
    permission_classes = [IsAdmin]
    queryset = Family.objects.all()
