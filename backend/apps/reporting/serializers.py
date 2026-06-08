from rest_framework import serializers

from .models import SavedReport, ScheduledReport


class SavedReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = SavedReport
        fields = [
            "id", "name", "description", "module", "query_params",
            "is_public", "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ScheduledReportSerializer(serializers.ModelSerializer):
    saved_report_name = serializers.CharField(source="saved_report.name", read_only=True)

    class Meta:
        model = ScheduledReport
        fields = [
            "id", "saved_report", "saved_report_name", "schedule_cron",
            "recipients_emails", "last_run", "next_run", "is_active", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
