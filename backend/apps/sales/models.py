from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class CustomerStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    PROSPECT = "prospect", "Prospect"


class QuoteStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SENT = "sent", "Sent"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    EXPIRED = "expired", "Expired"


class SalesOrderStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CONFIRMED = "confirmed", "Confirmed"
    IN_PRODUCTION = "in_production", "In Production"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class Customer(TimeStampedModel):
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=32, unique=True)
    country = models.CharField(max_length=64, blank=True)
    address = models.TextField(blank=True)
    contact_name = models.CharField(max_length=128, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="MAD")
    status = models.CharField(max_length=16, choices=CustomerStatus.choices, default=CustomerStatus.ACTIVE)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class Quote(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="quotes")
    validity_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=QuoteStatus.choices, default=QuoteStatus.DRAFT)
    currency = models.CharField(max_length=8, default="MAD")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.ref} ({self.customer.code})"


class QuoteLine(TimeStampedModel):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="lines")
    description = models.CharField(max_length=256)
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):  # type: ignore[override]
        self.line_total = self.qty * self.unit_price * (1 - self.discount / 100)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.quote.ref} / {self.description[:40]}"


class SalesOrder(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="sales_orders")
    quote = models.ForeignKey(Quote, null=True, blank=True, on_delete=models.SET_NULL, related_name="sales_orders")
    order_date = models.DateField(auto_now_add=True)
    delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=SalesOrderStatus.choices, default=SalesOrderStatus.DRAFT)
    currency = models.CharField(max_length=8, default="MAD")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.ref} — {self.customer.code}"


class SalesOrderLine(TimeStampedModel):
    order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="lines")
    item_sku = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=256)
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    delivered_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):  # type: ignore[override]
        self.line_total = self.qty * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.order.ref} / {self.description[:40]}"
