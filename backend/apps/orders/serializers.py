from rest_framework import serializers

from apps.catalog.serializers import ArticleSerializer
from apps.production.models import Stage, StageEvent, StageEventStatus

from .models import Order, OrderLine, Priority


class StageEventInlineSerializer(serializers.ModelSerializer):
    stage_code = serializers.CharField(source="stage.code", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    stage_sequence = serializers.IntegerField(source="stage.sequence", read_only=True)
    completed_by_username = serializers.CharField(
        source="completed_by.username", read_only=True, default=None
    )

    class Meta:
        model = StageEvent
        fields = [
            "id", "stage_code", "stage_name", "stage_sequence",
            "status", "started_at", "completed_at", "completed_by_username", "comment",
        ]
        read_only_fields = fields


class OrderLineSerializer(serializers.ModelSerializer):
    article_ref = serializers.CharField(source="article.ref_client", read_only=True)
    article_desc = serializers.CharField(source="article.description", read_only=True)
    current_stage_code = serializers.CharField(
        source="current_stage.code", read_only=True, default=None
    )
    events = StageEventInlineSerializer(many=True, read_only=True)

    class Meta:
        model = OrderLine
        fields = [
            "id", "n_serie", "article", "article_ref", "article_desc",
            "quantity", "priority", "status", "current_stage_code",
            "comments", "events",
        ]
        read_only_fields = ["id", "events"]


class OrderLineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderLine
        fields = ["n_serie", "article", "quantity", "priority", "comments"]


class OrderSerializer(serializers.ModelSerializer):
    client_code = serializers.CharField(source="client.code", read_only=True)
    line_count = serializers.IntegerField(source="lines.count", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "n_ordre", "client", "client_code", "creation_date",
            "delivery_date", "status", "notes", "line_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class OrderDetailSerializer(OrderSerializer):
    lines = OrderLineSerializer(many=True, read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["lines"]  # type: ignore[operator]


class OrderCreateSerializer(serializers.ModelSerializer):
    lines = OrderLineCreateSerializer(many=True)

    class Meta:
        model = Order
        fields = ["id", "n_ordre", "client", "creation_date", "delivery_date", "notes", "lines"]
        read_only_fields = ["id"]

    def create(self, validated_data: dict) -> Order:  # type: ignore[override]
        lines_data = validated_data.pop("lines")
        order = Order.objects.create(**validated_data)
        for line_data in lines_data:
            OrderLine.objects.create(order=order, **line_data)
        return order
