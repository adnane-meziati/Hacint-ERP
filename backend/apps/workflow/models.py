from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class WorkflowStage(models.TextChoices):
    TECHNICAL_STUDY = "technical_study", "Étude Technique"
    DESIGNER = "designer", "Dessin"
    PROGRAMMER = "programmer", "Programmation"
    CNC = "cnc", "CNC"
    QC = "qc", "Contrôle Qualité"
    PRODUCTION = "production", "Production"
    DONE = "done", "Terminé"


class ApnPriority(models.TextChoices):
    LOW = "low", "Faible"
    NORMAL = "normal", "Normal"
    HIGH = "high", "Haute"
    URGENT = "urgent", "Urgent"


class ProjectStatus(models.TextChoices):
    ACTIVE = "active", "Actif"
    COMPLETED = "completed", "Terminé"
    CANCELLED = "cancelled", "Annulé"


class ValidationStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    APPROVED = "approved", "Validé"
    REJECTED = "rejected", "Rejeté"


class WorkflowOrderStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    IN_PROGRESS = "in_progress", "En cours"
    COMPLETED = "completed", "Terminé"
    CANCELLED = "cancelled", "Annulé"


class AttachmentType(models.TextChoices):
    PDF = "pdf", "PDF"
    G_CODE = "g_code", "G-Code"
    EXCEL = "excel", "Excel"
    OTHER = "other", "Autre"


class Project(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
        db_index=True,
    )
    validation_status = models.CharField(
        max_length=16,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING,
        db_index=True,
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class WorkflowOrder(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="orders", on_delete=models.CASCADE)
    order_number = models.CharField(max_length=64, unique=True)
    order_date = models.DateField()
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=WorkflowOrderStatus.choices,
        default=WorkflowOrderStatus.PENDING,
        db_index=True,
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["project_id", "order_number"]

    def __str__(self) -> str:
        return self.order_number


class Apn(TimeStampedModel):
    work_order = models.ForeignKey(WorkflowOrder, related_name="apns", on_delete=models.CASCADE)
    apn_code = models.CharField(max_length=128)
    specification = models.TextField(blank=True)
    priority = models.CharField(
        max_length=8,
        choices=ApnPriority.choices,
        default=ApnPriority.NORMAL,
    )
    has_sample = models.BooleanField(default=False)
    current_stage = models.CharField(
        max_length=20,
        choices=WorkflowStage.choices,
        default=WorkflowStage.TECHNICAL_STUDY,
        db_index=True,
    )
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_apns",
        db_index=True,
    )

    class Meta:
        ordering = ["work_order_id", "apn_code"]
        unique_together = [("work_order", "apn_code")]

    def __str__(self) -> str:
        return f"{self.apn_code} @ {self.current_stage}"


class ApnStageHistory(TimeStampedModel):
    apn = models.ForeignKey(Apn, related_name="history", on_delete=models.CASCADE)
    from_stage = models.CharField(
        max_length=20,
        choices=WorkflowStage.choices,
        null=True,
        blank=True,
    )
    to_stage = models.CharField(max_length=20, choices=WorkflowStage.choices)
    transitioned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["apn_id", "created_at"]

    def __str__(self) -> str:
        return f"{self.apn_id}: {self.from_stage} → {self.to_stage}"


class ApnAttachment(TimeStampedModel):
    apn = models.ForeignKey(Apn, related_name="attachments", on_delete=models.CASCADE)
    attachment_type = models.CharField(max_length=8, choices=AttachmentType.choices)
    file = models.FileField(upload_to="workflow/attachments/%Y/%m/")
    original_name = models.CharField(max_length=255)
    size_bytes = models.PositiveBigIntegerField()
    stage_at_upload = models.CharField(
        max_length=20,
        choices=WorkflowStage.choices,
        null=True,
        blank=True,
    )
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["apn_id", "-created_at"]

    def __str__(self) -> str:
        return f"{self.original_name} ({self.attachment_type})"


# ---------------------------------------------------------------------------
# Technical Study Validation
# ---------------------------------------------------------------------------

class MatrixSample(TimeStampedModel):
    """Reference matrix — the master/expected list of samples all projects must match."""
    reference = models.CharField(max_length=128, unique=True)
    designation = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    sample_type = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["reference"]

    def __str__(self) -> str:
        return f"{self.reference} (x{self.quantity})"


class ProjectSample(TimeStampedModel):
    """Sample declared on a project — compared against the reference matrix."""
    project = models.ForeignKey(Project, related_name="samples", on_delete=models.CASCADE)
    reference = models.CharField(max_length=128)
    designation = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    sample_type = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["project_id", "reference"]
        unique_together = [("project", "reference")]

    def __str__(self) -> str:
        return f"{self.reference} @ {self.project_id}"


class ProjectValidation(TimeStampedModel):
    """Persisted validation result and approval record for a project."""
    project = models.OneToOneField(Project, related_name="validation", on_delete=models.CASCADE)
    validation_status = models.CharField(
        max_length=16,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING,
        db_index=True,
    )
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    result = models.JSONField(default=dict)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Validation {self.project_id}: {self.validation_status}"
