from rest_framework import serializers

from .models import Apn, ApnAttachment, ApnStageHistory, Project, WorkflowOrder


# ---------------------------------------------------------------------------
# Stage history
# ---------------------------------------------------------------------------

class ApnStageHistorySerializer(serializers.ModelSerializer):
    transitioned_by_username = serializers.CharField(
        source="transitioned_by.username", read_only=True, default=None
    )

    class Meta:
        model = ApnStageHistory
        fields = [
            "id", "from_stage", "to_stage",
            "transitioned_by_username", "comment", "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

class ApnAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ApnAttachment
        fields = [
            "id", "attachment_type", "original_name",
            "size_bytes", "stage_at_upload", "notes", "file_url", "created_at",
        ]
        read_only_fields = ["id", "file_url", "created_at"]

    def get_file_url(self, obj: ApnAttachment) -> str | None:
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


# ---------------------------------------------------------------------------
# APN
# ---------------------------------------------------------------------------

class ApnListSerializer(serializers.ModelSerializer):
    assigned_user_username = serializers.CharField(
        source="assigned_user.username", read_only=True, default=None
    )

    class Meta:
        model = Apn
        fields = [
            "id", "apn_code", "specification", "priority",
            "has_sample", "current_stage", "assigned_user", "assigned_user_username",
        ]
        read_only_fields = ["id", "assigned_user_username"]


class ApnDetailSerializer(serializers.ModelSerializer):
    assigned_user_username = serializers.CharField(
        source="assigned_user.username", read_only=True, default=None
    )
    history = ApnStageHistorySerializer(many=True, read_only=True)
    attachments = ApnAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Apn
        fields = [
            "id", "work_order", "apn_code", "specification", "priority",
            "has_sample", "current_stage", "assigned_user", "assigned_user_username",
            "history", "attachments", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "assigned_user_username", "history", "attachments", "created_at", "updated_at"]


class ApnCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apn
        fields = ["apn_code", "specification", "priority", "has_sample", "assigned_user"]


# ---------------------------------------------------------------------------
# WorkflowOrder
# ---------------------------------------------------------------------------

class WorkflowOrderListSerializer(serializers.ModelSerializer):
    apn_count = serializers.IntegerField(source="apns.count", read_only=True)

    class Meta:
        model = WorkflowOrder
        fields = [
            "id", "project", "order_number", "order_date",
            "description", "status", "apn_count",
        ]
        read_only_fields = ["id", "apn_count"]


class WorkflowOrderDetailSerializer(serializers.ModelSerializer):
    apns = ApnListSerializer(many=True, read_only=True)
    apn_count = serializers.IntegerField(source="apns.count", read_only=True)

    class Meta:
        model = WorkflowOrder
        fields = [
            "id", "project", "order_number", "order_date",
            "description", "status", "apn_count", "apns",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "apn_count", "apns", "created_at", "updated_at"]


class WorkflowOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowOrder
        fields = ["order_number", "order_date", "description", "status"]


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

class ProjectListSerializer(serializers.ModelSerializer):
    order_count = serializers.IntegerField(source="orders.count", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "code", "name", "description", "status", "order_count", "created_at"]
        read_only_fields = ["id", "order_count", "created_at"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    orders = WorkflowOrderListSerializer(many=True, read_only=True)
    order_count = serializers.IntegerField(source="orders.count", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "code", "name", "description", "status",
            "order_count", "orders", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "order_count", "orders", "created_at", "updated_at"]


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "code", "name", "description", "status"]
        read_only_fields = ["id"]
