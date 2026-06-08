import uuid

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from common.models import TimeStampedModel


class AttachmentKind(models.TextChoices):
    DRAWING = "drawing", "Drawing (PDF)"
    CAM = "cam", "CAM file"
    PHOTO = "photo", "Photo"
    REPORT = "report", "Report"
    OTHER = "other", "Other"


class Attachment(TimeStampedModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    target = GenericForeignKey("content_type", "object_id")

    kind = models.CharField(max_length=16, choices=AttachmentKind.choices)
    file = models.FileField(upload_to="attachments/%Y/%m/")
    original_name = models.CharField(max_length=255)
    size_bytes = models.PositiveBigIntegerField()
    mime = models.CharField(max_length=128)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.original_name} ({self.kind})"
