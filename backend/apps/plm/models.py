from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class BOMStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    OBSOLETE = "obsolete", "Obsolete"


class ECNStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    UNDER_REVIEW = "under_review", "Under Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    IMPLEMENTED = "implemented", "Implemented"


class ECNPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class BillOfMaterials(TimeStampedModel):
    article = models.ForeignKey(
        "catalog.Article", on_delete=models.PROTECT, related_name="boms"
    )
    revision = models.CharField(max_length=16, default="A")
    status = models.CharField(max_length=16, choices=BOMStatus.choices, default=BOMStatus.DRAFT)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Bill of Materials"
        verbose_name_plural = "Bills of Materials"
        unique_together = [("article", "revision")]

    def __str__(self) -> str:
        return f"BOM {self.article.ref_client} Rev.{self.revision}"


class BOMLine(TimeStampedModel):
    bom = models.ForeignKey(BillOfMaterials, on_delete=models.CASCADE, related_name="lines")
    component = models.ForeignKey(
        "catalog.Article", on_delete=models.PROTECT, related_name="bom_usages"
    )
    qty = models.DecimalField(max_digits=12, decimal_places=4, default=1)
    unit = models.CharField(max_length=16, default="pce")
    notes = models.CharField(max_length=256, blank=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "BOM Line"

    def __str__(self) -> str:
        return f"{self.bom} / {self.component.ref_client} × {self.qty}"


class EngineeringChangeNotice(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    title = models.CharField(max_length=256)
    description = models.TextField()
    affected_bom = models.ForeignKey(
        BillOfMaterials, null=True, blank=True, on_delete=models.SET_NULL, related_name="ecns"
    )
    status = models.CharField(max_length=16, choices=ECNStatus.choices, default=ECNStatus.DRAFT)
    priority = models.CharField(max_length=16, choices=ECNPriority.choices, default=ECNPriority.MEDIUM)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="ecn_requests"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ecn_approvals",
    )
    effective_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Engineering Change Notice"
        verbose_name_plural = "Engineering Change Notices"

    def __str__(self) -> str:
        return f"{self.ref} — {self.title[:60]}"
