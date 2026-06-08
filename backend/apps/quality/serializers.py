from rest_framework import serializers

from .models import Audit, CAPA, Inspection, InspectionLine, NonConformity


class InspectionLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionLine
        fields = ["id", "checkpoint", "result", "remarks"]
        read_only_fields = ["id"]


class InspectionSerializer(serializers.ModelSerializer):
    inspector_name = serializers.CharField(source="inspector.username", read_only=True)
    lines = InspectionLineSerializer(many=True, read_only=True)
    line_count = serializers.IntegerField(source="lines.count", read_only=True)
    pass_count = serializers.SerializerMethodField()
    fail_count = serializers.SerializerMethodField()

    class Meta:
        model = Inspection
        fields = [
            "id", "ref", "sales_order_ref", "mo_ref", "inspector", "inspector_name",
            "status", "inspection_date", "notes", "lines",
            "line_count", "pass_count", "fail_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_pass_count(self, obj: Inspection) -> int:
        return obj.lines.filter(result="pass").count()

    def get_fail_count(self, obj: Inspection) -> int:
        return obj.lines.filter(result="fail").count()


class CAPASerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.username", read_only=True)

    class Meta:
        model = CAPA
        fields = [
            "id", "ncr", "action_type", "description", "assigned_to",
            "assigned_to_name", "due_date", "status", "completion_notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class NonConformitySerializer(serializers.ModelSerializer):
    capas = CAPASerializer(many=True, read_only=True)

    class Meta:
        model = NonConformity
        fields = [
            "id", "ref", "inspection", "description", "severity",
            "status", "notes", "capas", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Audit
        fields = [
            "id", "ref", "audit_type", "scope", "auditor",
            "planned_date", "actual_date", "status", "findings", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
