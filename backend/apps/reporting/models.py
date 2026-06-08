from django.db import models

from common.models import TimeStampedModel


class SavedReport(TimeStampedModel):
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=32)
    query_params = models.JSONField(default=dict, blank=True)
    is_public = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.module})"


class ScheduledReport(TimeStampedModel):
    saved_report = models.ForeignKey(SavedReport, on_delete=models.CASCADE, related_name="schedules")
    schedule_cron = models.CharField(max_length=64, default="0 8 * * 1")
    recipients_emails = models.TextField(help_text="Comma-separated email addresses")
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=256, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Schedule: {self.saved_report.name}"
