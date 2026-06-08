from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class InspectionStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    IN_PROGRESS = "in_progress", "In Progress"
    PASSED = "passed", "Passed"
    FAILED = "failed", "Failed"
    ON_HOLD = "on_hold", "On Hold"


class NCRSeverity(models.TextChoices):
    MINOR = "minor", "Minor"
    MAJOR = "major", "Major"
    CRITICAL = "critical", "Critical"


class NCRStatus(models.TextChoices):
    OPEN = "open", "Open"
    UNDER_REVIEW = "under_review", "Under Review"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class CAPAStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    VERIFIED = "verified", "Verified"


class AuditStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"


class InspectionResult(models.TextChoices):
    PASS = "pass", "Pass"
    FAIL = "fail", "Fail"
    NA = "na", "N/A"


class Inspection(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    sales_order_ref = models.CharField(max_length=32, blank=True)
    mo_ref = models.CharField(max_length=32, blank=True)
    inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="inspections"
    )
    status = models.CharField(max_length=16, choices=InspectionStatus.choices, default=InspectionStatus.PLANNED)
    inspection_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-inspection_date"]

    def __str__(self) -> str:
        return f"{self.ref} — {self.status}"


class InspectionLine(TimeStampedModel):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name="lines")
    checkpoint = models.CharField(max_length=256)
    result = models.CharField(max_length=8, choices=InspectionResult.choices, default=InspectionResult.NA)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.inspection.ref} / {self.checkpoint[:40]}"


class NonConformity(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    inspection = models.ForeignKey(
        Inspection, null=True, blank=True, on_delete=models.SET_NULL, related_name="ncrs"
    )
    description = models.TextField()
    severity = models.CharField(max_length=16, choices=NCRSeverity.choices, default=NCRSeverity.MINOR)
    status = models.CharField(max_length=16, choices=NCRStatus.choices, default=NCRStatus.OPEN)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Non-Conformity"
        verbose_name_plural = "Non-Conformities"

    def __str__(self) -> str:
        return f"{self.ref} [{self.severity}]"


class CAPA(TimeStampedModel):
    ncr = models.ForeignKey(NonConformity, on_delete=models.CASCADE, related_name="capas")
    action_type = models.CharField(
        max_length=16,
        choices=[("corrective", "Corrective"), ("preventive", "Preventive")],
        default="corrective",
    )
    description = models.TextField()
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="capas"
    )
    due_date = models.DateField()
    status = models.CharField(max_length=16, choices=CAPAStatus.choices, default=CAPAStatus.OPEN)
    completion_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["due_date"]
        verbose_name = "CAPA"
        verbose_name_plural = "CAPAs"

    def __str__(self) -> str:
        return f"CAPA {self.id} — {self.action_type}"


class Audit(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    audit_type = models.CharField(
        max_length=16,
        choices=[("internal", "Internal"), ("external", "External"), ("customer", "Customer")],
        default="internal",
    )
    scope = models.CharField(max_length=256)
    auditor = models.CharField(max_length=128)
    planned_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=AuditStatus.choices, default=AuditStatus.PLANNED)
    findings = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-planned_date"]

    def __str__(self) -> str:
        return f"{self.ref} — {self.audit_type}"
