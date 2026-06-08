from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    entity = serializers.CharField(source="content_type.model", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id", "username", "action", "entity", "object_id",
            "before_json", "after_json", "timestamp",
        ]
        read_only_fields = fields
