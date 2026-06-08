from rest_framework import serializers

from apps.orders.models import OrderLine
from apps.orders.serializers import OrderLineSerializer

from .models import ManufacturingOrder, Routing, Stage, StageEvent, StageEventStatus, WorkCenter


class WorkCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkCenter
        fields = ["id", "code", "name", "capacity_per_hour", "setup_time_minutes", "is_active"]
        read_only_fields = ["id"]


class ManufacturingOrderSerializer(serializers.ModelSerializer):
    work_center_code = serializers.CharField(source="work_center.code", read_only=True)
    work_center_name = serializers.CharField(source="work_center.name", read_only=True)

    class Meta:
        model = ManufacturingOrder
        fields = [
            "id", "ref", "work_center", "work_center_code", "work_center_name",
            "bom", "sales_order_line", "planned_start", "planned_end",
            "actual_start", "actual_end", "qty_planned", "qty_produced",
            "status", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RoutingSerializer(serializers.ModelSerializer):
    work_center_code = serializers.CharField(source="work_center.code", read_only=True)

    class Meta:
        model = Routing
        fields = [
            "id", "name", "work_center", "work_center_code", "bom",
            "sequence", "operation_description", "standard_time_minutes",
        ]
        read_only_fields = ["id"]


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = ["id", "code", "name", "sequence", "is_active"]
        read_only_fields = ["id"]


class StageEventSerializer(serializers.ModelSerializer):
    stage_code = serializers.CharField(source="stage.code", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    completed_by_username = serializers.CharField(
        source="completed_by.username", read_only=True, default=None
    )

    class Meta:
        model = StageEvent
        fields = [
            "id", "stage", "stage_code", "stage_name",
            "status", "started_at", "completed_at", "completed_by_username", "comment",
        ]
        read_only_fields = ["id", "stage", "stage_code", "stage_name",
                            "started_at", "completed_at", "completed_by_username"]


class QueueLineSerializer(serializers.ModelSerializer):
    """Compact serializer for queue view — one line per card."""
    order_n_ordre = serializers.IntegerField(source="order.n_ordre", read_only=True)
    client_code = serializers.CharField(source="order.client.code", read_only=True)
    article_ref = serializers.CharField(source="article.ref_client", read_only=True)
    article_desc = serializers.CharField(source="article.description", read_only=True)
    current_stage_code = serializers.CharField(
        source="current_stage.code", read_only=True, default=None
    )
    stage_event_id = serializers.SerializerMethodField()
    stage_event_status = serializers.SerializerMethodField()
    stage_event_comment = serializers.SerializerMethodField()

    class Meta:
        model = OrderLine
        fields = [
            "id", "n_serie", "order_n_ordre", "client_code",
            "article_ref", "article_desc", "quantity", "priority",
            "status", "current_stage_code", "sort_order",
            "stage_event_id", "stage_event_status", "stage_event_comment",
        ]

    def _get_event(self, obj: OrderLine) -> StageEvent | None:
        stage_code: str = self.context.get("stage_code", "")
        for ev in obj.events.all():
            if ev.stage.code == stage_code:
                return ev
        return None

    def get_stage_event_id(self, obj: OrderLine) -> str | None:
        ev = self._get_event(obj)
        return str(ev.id) if ev else None

    def get_stage_event_status(self, obj: OrderLine) -> str | None:
        ev = self._get_event(obj)
        return ev.status if ev else None

    def get_stage_event_comment(self, obj: OrderLine) -> str | None:
        ev = self._get_event(obj)
        return ev.comment if ev else None
