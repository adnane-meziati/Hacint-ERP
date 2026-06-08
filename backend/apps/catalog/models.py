from django.db import models

from common.models import TimeStampedModel


class Client(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=64, blank=True)
    contact_email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="clients/", blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return self.code


class Family(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ["code"]
        verbose_name_plural = "families"

    def __str__(self) -> str:
        return self.code


class Article(TimeStampedModel):
    ref_client = models.CharField(max_length=128, unique=True)
    description = models.CharField(max_length=255)
    family = models.ForeignKey(Family, on_delete=models.PROTECT, related_name="articles")
    notes = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["ref_client"]

    def __str__(self) -> str:
        return self.ref_client

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class ArticleRevision(TimeStampedModel):
    article = models.ForeignKey(Article, related_name="revisions", on_delete=models.CASCADE)
    revision_no = models.CharField(max_length=16)
    effective_date = models.DateField()
    drawing_pdf = models.FileField(upload_to="drawings/", blank=True)
    cam_archive = models.FileField(upload_to="cam/", blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [("article", "revision_no")]
        ordering = ["-effective_date"]

    def __str__(self) -> str:
        return f"{self.article.ref_client} rev {self.revision_no}"
