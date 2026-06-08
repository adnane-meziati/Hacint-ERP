from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsPlannerOrAbove, IsReadOnlyForClient

from apps.orders.models import OrderLine

from .models import ManufacturingOrder, Routing, Stage, StageEvent, StageEventStatus, WorkCenter
from .serializers import (
    ManufacturingOrderSerializer,
    QueueLineSerializer,
    RoutingSerializer,
    StageEventSerializer,
    StageSerializer,
    WorkCenterSerializer,
)


class WorkCenterViewSet(viewsets.ModelViewSet):
    queryset = WorkCenter.objects.all()
    serializer_class = WorkCenterSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_active"]
    search_fields = ["code", "name"]


class ManufacturingOrderViewSet(viewsets.ModelViewSet):
    queryset = ManufacturingOrder.objects.select_related("work_center", "bom").all()
    serializer_class = ManufacturingOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "work_center"]
    search_fields = ["ref"]
    ordering_fields = ["planned_start", "planned_end", "status"]


class RoutingViewSet(viewsets.ModelViewSet):
    queryset = Routing.objects.select_related("work_center").all()
    serializer_class = RoutingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["work_center", "bom"]
    search_fields = ["name"]


class StageListView(generics.ListAPIView):
    """GET /api/stages/"""

    serializer_class = StageSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Stage.objects.filter(is_active=True)


class StageEventDetailView(generics.RetrieveAPIView):
    """GET /api/events/{id}/"""

    serializer_class = StageEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        return StageEvent.objects.select_related("stage", "completed_by")


class _StageActionBase(APIView):
    """Shared logic for start / complete / block action endpoints."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_line_and_event(self, line_pk: str, stage_code: str):
        line = generics.get_object_or_404(
            OrderLine.objects.select_related("current_stage"),
            pk=line_pk,
        )
        stage = generics.get_object_or_404(Stage, code__iexact=stage_code)
        event = generics.get_object_or_404(StageEvent, line=line, stage=stage)
        return line, stage, event


class StageStartView(_StageActionBase):
    """POST /api/lines/{pk}/stages/{code}/start"""

    def post(self, request: Request, pk: str, code: str) -> Response:
        _line, _stage, event = self._get_line_and_event(pk, code)
        if event.status not in (StageEventStatus.PENDING, StageEventStatus.BLOCKED):
            return Response(
                {"detail": "Stage is not in a startable state."},
                status=status.HTTP_409_CONFLICT,
            )
        event.status = StageEventStatus.IN_PROGRESS
        event.started_at = timezone.now()
        event.save(update_fields=["status", "started_at", "updated_at"])
        return Response(StageEventSerializer(event).data)


class StageCompleteView(_StageActionBase):
    """POST /api/lines/{pk}/stages/{code}/complete"""

    def post(self, request: Request, pk: str, code: str) -> Response:
        _line, _stage, event = self._get_line_and_event(pk, code)
        if event.status == StageEventStatus.DONE:
            return Response(
                {"detail": "Stage is already done."},
                status=status.HTTP_409_CONFLICT,
            )
        comment = request.data.get("comment", "")
        event.status = StageEventStatus.DONE
        event.completed_at = timezone.now()
        event.completed_by = request.user
        if comment:
            event.comment = comment
        if not event.started_at:
            event.started_at = event.completed_at
        event.save(update_fields=["status", "started_at", "completed_at", "completed_by", "comment", "updated_at"])
        return Response(StageEventSerializer(event).data)


class StageBlockView(_StageActionBase):
    """POST /api/lines/{pk}/stages/{code}/block"""

    def post(self, request: Request, pk: str, code: str) -> Response:
        _line, _stage, event = self._get_line_and_event(pk, code)
        if event.status == StageEventStatus.DONE:
            return Response(
                {"detail": "Cannot block a completed stage."},
                status=status.HTTP_409_CONFLICT,
            )
        comment = request.data.get("comment", "")
        event.status = StageEventStatus.BLOCKED
        if comment:
            event.comment = comment
        event.save(update_fields=["status", "comment", "updated_at"])
        return Response(StageEventSerializer(event).data)


class QueueView(generics.ListAPIView):
    """GET /api/queues/{stage_code}/ — all active lines at this stage."""

    serializer_class = QueueLineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        stage_code = self.kwargs["stage_code"]
        return (
            OrderLine.objects.select_related(
                "order__client", "article", "current_stage"
            )
            .prefetch_related("events__stage")
            .filter(current_stage__code__iexact=stage_code, deleted_at__isnull=True)
            .order_by("sort_order", "priority", "order__n_ordre", "n_serie")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["stage_code"] = self.kwargs["stage_code"].upper()
        return ctx


class SendToStageView(APIView):
    """POST /api/production/lines/{pk}/send-to/
    Body: { stage_code: "CAD" }
    Moves a line to the given stage so it appears in that stage's queue.
    Any authenticated worker can use this to self-assign work.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, pk: str) -> Response:
        stage_code = (request.data.get("stage_code") or "").upper()
        if not stage_code:
            return Response({"detail": "stage_code is required."}, status=status.HTTP_400_BAD_REQUEST)

        line = generics.get_object_or_404(OrderLine, pk=pk, deleted_at__isnull=True)
        stage = generics.get_object_or_404(Stage, code__iexact=stage_code, is_active=True)

        # Create the StageEvent for this stage if it doesn't exist yet
        event, _ = StageEvent.objects.get_or_create(line=line, stage=stage)

        # If already done, don't allow sending back
        if event.status == StageEventStatus.DONE:
            return Response(
                {"detail": f"Stage {stage_code} is already completed for this line."},
                status=status.HTTP_409_CONFLICT,
            )

        # Move line to this stage
        line.current_stage = stage
        line.save(update_fields=["current_stage", "updated_at"])

        return Response({"detail": f"Line moved to {stage_code} queue.", "line_id": str(line.id)})


class ReorderQueueView(APIView):
    """POST /api/planning/reorder/

    Accepts { stage_code, line_ids: [uuid, ...] } and persists the
    drag-and-drop order by writing sort_order = position index.
    """

    permission_classes = [IsPlannerOrAbove]

    def post(self, request: Request) -> Response:
        stage_code = request.data.get("stage_code", "").upper()
        line_ids: list[str] = request.data.get("line_ids", [])

        if not stage_code or not isinstance(line_ids, list):
            return Response(
                {"detail": "stage_code and line_ids are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate all IDs belong to the given stage
        lines = OrderLine.objects.filter(
            id__in=line_ids,
            current_stage__code=stage_code,
            deleted_at__isnull=True,
        )
        found_ids = {str(l.id) for l in lines}
        missing = [lid for lid in line_ids if lid not in found_ids]
        if missing:
            return Response(
                {"detail": f"Line IDs not found at stage {stage_code}: {missing}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Bulk update sort_order values
        for idx, line_id in enumerate(line_ids):
            OrderLine.objects.filter(id=line_id).update(sort_order=idx)

        return Response({"detail": "Queue reordered.", "count": len(line_ids)})
