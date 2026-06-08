from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class NotificationLevel(models.TextChoices):
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    ERROR = "error", "Error"


class Notification(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="notifications",
        on_delete=models.CASCADE,
    )
    level = models.CharField(
        max_length=16, choices=NotificationLevel.choices, default=NotificationLevel.INFO
    )
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.level}] {self.user} — {self.message[:50]}"
