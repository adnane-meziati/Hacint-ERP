from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class WorkCenter(TimeStampedModel):
    code = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=128)
    capacity_per_hour = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    setup_time_minutes = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class ManufacturingOrder(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    ref = models.CharField(max_length=32, unique=True)
    sales_order_line = models.ForeignKey(
        "sales.SalesOrderLine",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="manufacturing_orders",
    )
    bom = models.ForeignKey(
        "plm.BillOfMaterials",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="manufacturing_orders",
    )
    work_center = models.ForeignKey(
        WorkCenter,
        on_delete=models.PROTECT,
        related_name="manufacturing_orders",
    )
    planned_start = models.DateField(null=True, blank=True)
    planned_end = models.DateField(null=True, blank=True)
    actual_start = models.DateField(null=True, blank=True)
    actual_end = models.DateField(null=True, blank=True)
    qty_planned = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    qty_produced = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-planned_start"]

    def __str__(self) -> str:
        return f"MO {self.ref}"


class Routing(TimeStampedModel):
    name = models.CharField(max_length=128)
    work_center = models.ForeignKey(
        WorkCenter,
        on_delete=models.PROTECT,
        related_name="routings",
    )
    bom = models.ForeignKey(
        "plm.BillOfMaterials",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="routings",
    )
    sequence = models.PositiveSmallIntegerField(default=10)
    operation_description = models.TextField(blank=True)
    standard_time_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["work_center", "sequence"]

    def __str__(self) -> str:
        return f"{self.name} ({self.work_center.code})"


class Stage(TimeStampedModel):
    code = models.CharField(max_length=8, unique=True)
    name = models.CharField(max_length=64)
    sequence = models.PositiveSmallIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sequence"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class StageEventStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In progress"
    DONE = "done", "Done"
    BLOCKED = "blocked", "Blocked"


class StageEvent(TimeStampedModel):
    line = models.ForeignKey(
        "orders.OrderLine",
        related_name="events",
        on_delete=models.CASCADE,
    )
    stage = models.ForeignKey(Stage, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=16,
        choices=StageEventStatus.choices,
        default=StageEventStatus.PENDING,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="completed_events",
    )
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = [("line", "stage")]
        ordering = ["line_id", "stage__sequence"]

    def __str__(self) -> str:
        return f"Line {self.line_id} / {self.stage.code} → {self.status}"
