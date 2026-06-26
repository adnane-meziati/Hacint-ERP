from rest_framework import serializers

from .models import Apn, ApnAttachment, ApnStageHistory, MatrixSample, Project, ProjectSample, ProjectValidation, WorkflowOrder


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

class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "code", "name", "description", "status"]
        read_only_fields = ["id"]


# ---------------------------------------------------------------------------
# Technical Study Validation
# ---------------------------------------------------------------------------

class MatrixSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatrixSample
        fields = ["id", "reference", "designation", "quantity", "sample_type", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectSample
        fields = ["id", "project", "reference", "designation", "quantity", "sample_type", "notes", "created_at"]
        read_only_fields = ["id", "project", "created_at"]


class ProjectValidationSerializer(serializers.ModelSerializer):
    validated_by_username = serializers.CharField(source="validated_by.username", read_only=True, default=None)
    approved_by_username = serializers.CharField(source="approved_by.username", read_only=True, default=None)

    class Meta:
        model = ProjectValidation
        fields = [
            "id", "validation_status",
            "validated_at", "validated_by_username",
            "approved_at", "approved_by_username",
            "result", "created_at", "updated_at",
        ]
        read_only_fields = fields


class ProjectListSerializer(serializers.ModelSerializer):
    order_count = serializers.IntegerField(source="orders.count", read_only=True)
    sample_count = serializers.IntegerField(source="samples.count", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "code", "name", "description", "status", "validation_status", "order_count", "sample_count", "created_at"]
        read_only_fields = ["id", "order_count", "sample_count", "created_at"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    orders = WorkflowOrderListSerializer(many=True, read_only=True)
    order_count = serializers.IntegerField(source="orders.count", read_only=True)
    samples = ProjectSampleSerializer(many=True, read_only=True)
    validation = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "code", "name", "description", "status", "validation_status",
            "order_count", "orders", "samples", "validation",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "order_count", "orders", "samples", "validation", "created_at", "updated_at"]

    def get_validation(self, obj: "Project"):  # type: ignore[override]
        try:
            return ProjectValidationSerializer(obj.validation, context=self.context).data
        except ProjectValidation.DoesNotExist:
            return None
