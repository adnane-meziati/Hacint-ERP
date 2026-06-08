from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/"""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    """POST /api/notifications/{id}/read"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, pk: str) -> Response:
        notif = generics.get_object_or_404(
            Notification, pk=pk, user=request.user
        )
        if not notif.read_at:
            notif.read_at = timezone.now()
            notif.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notif).data)


class NotificationReadAllView(APIView):
    """POST /api/notifications/read-all"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request) -> Response:
        Notification.objects.filter(user=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({"detail": "All notifications marked as read."})
