"""Admin-only CRUD for Stage reference data."""

from rest_framework import generics

from common.permissions import IsAdmin

from .models import Stage
from .serializers import StageSerializer


class StageCreateView(generics.CreateAPIView):
    """POST /api/stages/ — admin only."""

    serializer_class = StageSerializer
    permission_classes = [IsAdmin]


class StageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/stages/{id}/ — admin only."""

    serializer_class = StageSerializer
    permission_classes = [IsAdmin]
    queryset = Stage.objects.all()
