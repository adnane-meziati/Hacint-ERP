from django.db import models
from django.db.models import Sum

from common.models import TimeStampedModel


class LocationType(models.TextChoices):
    RACK = "rack", "Rack"
    SHELF = "shelf", "Shelf"
    BIN = "bin", "Bin"
    FLOOR = "floor", "Floor"


class MovementType(models.TextChoices):
    RECEIPT = "receipt", "Receipt"
    ISSUE = "issue", "Issue"
    TRANSFER = "transfer", "Transfer"
    ADJUSTMENT = "adjustment", "Adjustment"
    RETURN = "return", "Return"


class Warehouse(TimeStampedModel):
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=16, unique=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class Location(TimeStampedModel):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="locations")
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=128, blank=True)
    location_type = models.CharField(max_length=16, choices=LocationType.choices, default=LocationType.BIN)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["warehouse", "code"]
        unique_together = [("warehouse", "code")]

    def __str__(self) -> str:
        return f"{self.warehouse.code} / {self.code}"


class Item(TimeStampedModel):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=64, blank=True)
    unit_of_measure = models.CharField(max_length=16, default="pce")
    reorder_point = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    lead_time_days = models.PositiveSmallIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sku"]

    def __str__(self) -> str:
        return f"{self.sku} — {self.name}"

    @property
    def current_stock(self) -> float:
        result = self.movements.aggregate(
            total=Sum(
                models.Case(
                    models.When(movement_type__in=[MovementType.RECEIPT, MovementType.RETURN], then=models.F("qty")),
                    models.When(movement_type=MovementType.ISSUE, then=-models.F("qty")),
                    models.When(movement_type=MovementType.ADJUSTMENT, then=models.F("qty")),
                    default=0,
                    output_field=models.DecimalField(),
                )
            )
        )
        return float(result["total"] or 0)

    @property
    def is_low_stock(self) -> bool:
        return self.current_stock <= float(self.reorder_point)


class StockMovement(TimeStampedModel):
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="movements")
    from_location = models.ForeignKey(
        Location, null=True, blank=True, on_delete=models.SET_NULL, related_name="outgoing_movements"
    )
    to_location = models.ForeignKey(
        Location, null=True, blank=True, on_delete=models.SET_NULL, related_name="incoming_movements"
    )
    qty = models.DecimalField(max_digits=12, decimal_places=3)
    movement_type = models.CharField(max_length=16, choices=MovementType.choices)
    reference = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.movement_type} {self.qty} × {self.item.sku}"
