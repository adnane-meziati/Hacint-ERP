from django.contrib.contenttypes.models import ContentType
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Attachment
from .serializers import AttachmentCreateSerializer, AttachmentSerializer


class AttachmentCreateView(APIView):
    """POST /api/attachments/ (multipart)"""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        serializer = AttachmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = serializer.save()
        return Response(
            AttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AttachmentListView(generics.ListAPIView):
    """GET /api/attachments/?content_type=orders.order&object_id=<uuid>"""

    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = Attachment.objects.all()
        ct_param = self.request.query_params.get("content_type", "")
        object_id = self.request.query_params.get("object_id", "")
        if ct_param and "." in ct_param:
            app_label, model = ct_param.split(".", 1)
            try:
                ct = ContentType.objects.get(app_label=app_label, model=model.lower())
                qs = qs.filter(content_type=ct)
            except ContentType.DoesNotExist:
                return Attachment.objects.none()
        if object_id:
            qs = qs.filter(object_id=object_id)
        return qs
