from django.db import models

from common.models import TimeStampedModel


class VendorStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    BLACKLISTED = "blacklisted", "Blacklisted"


class RFQStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SENT = "sent", "Sent"
    RECEIVED = "received", "Received"
    CANCELLED = "cancelled", "Cancelled"


class POStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CONFIRMED = "confirmed", "Confirmed"
    PARTIAL = "partial", "Partially Received"
    RECEIVED = "received", "Fully Received"
    CANCELLED = "cancelled", "Cancelled"


class Vendor(TimeStampedModel):
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=32, unique=True)
    country = models.CharField(max_length=64, blank=True)
    address = models.TextField(blank=True)
    contact_name = models.CharField(max_length=128, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    payment_terms = models.CharField(max_length=64, blank=True)
    currency = models.CharField(max_length=8, default="MAD")
    status = models.CharField(max_length=16, choices=VendorStatus.choices, default=VendorStatus.ACTIVE)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class RFQ(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="rfqs")
    status = models.CharField(max_length=16, choices=RFQStatus.choices, default=RFQStatus.DRAFT)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.ref} — {self.vendor.code}"


class RFQLine(TimeStampedModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="lines")
    description = models.CharField(max_length=256)
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit = models.CharField(max_length=16, default="pce")
    estimated_unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.rfq.ref} / {self.description[:40]}"


class PurchaseOrder(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="purchase_orders")
    rfq = models.ForeignKey(RFQ, null=True, blank=True, on_delete=models.SET_NULL, related_name="purchase_orders")
    expected_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=POStatus.choices, default=POStatus.DRAFT)
    currency = models.CharField(max_length=8, default="MAD")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.ref} — {self.vendor.code}"


class PurchaseOrderLine(TimeStampedModel):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    item_sku = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=256)
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit = models.CharField(max_length=16, default="pce")
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):  # type: ignore[override]
        self.line_total = self.qty * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.order.ref} / {self.description[:40]}"


class Receipt(TimeStampedModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="receipts")
    received_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-received_date"]

    def __str__(self) -> str:
        return f"Receipt {self.id} — {self.purchase_order.ref}"


class ReceiptLine(TimeStampedModel):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name="lines")
    po_line = models.ForeignKey(PurchaseOrderLine, on_delete=models.PROTECT, related_name="receipt_lines")
    qty_received = models.DecimalField(max_digits=12, decimal_places=3)
    notes = models.CharField(max_length=256, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"ReceiptLine {self.id}"
