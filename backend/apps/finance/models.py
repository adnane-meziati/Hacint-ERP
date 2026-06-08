from django.db import models

from common.models import TimeStampedModel


class AccountType(models.TextChoices):
    ASSET = "asset", "Asset"
    LIABILITY = "liability", "Liability"
    EQUITY = "equity", "Equity"
    REVENUE = "revenue", "Revenue"
    EXPENSE = "expense", "Expense"


class InvoiceType(models.TextChoices):
    CUSTOMER = "customer", "Customer Invoice"
    VENDOR = "vendor", "Vendor Invoice"
    CREDIT_NOTE = "credit_note", "Credit Note"


class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SENT = "sent", "Sent"
    PAID = "paid", "Paid"
    OVERDUE = "overdue", "Overdue"
    PARTIAL = "partial", "Partially Paid"
    CANCELLED = "cancelled", "Cancelled"


class PaymentMethod(models.TextChoices):
    BANK = "bank", "Bank Transfer"
    CASH = "cash", "Cash"
    CHECK = "check", "Check"
    CARD = "card", "Card"


class Account(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=128)
    account_type = models.CharField(max_length=16, choices=AccountType.choices)
    currency = models.CharField(max_length=8, default="MAD")
    balance = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class Invoice(TimeStampedModel):
    ref = models.CharField(max_length=32, unique=True)
    invoice_type = models.CharField(max_length=16, choices=InvoiceType.choices, default=InvoiceType.CUSTOMER)
    customer = models.ForeignKey(
        "sales.Customer", null=True, blank=True, on_delete=models.PROTECT, related_name="invoices"
    )
    vendor = models.ForeignKey(
        "purchase.Vendor", null=True, blank=True, on_delete=models.PROTECT, related_name="invoices"
    )
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=16, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    currency = models.CharField(max_length=8, default="MAD")
    total_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-issue_date"]

    def __str__(self) -> str:
        return f"{self.ref} [{self.status}]"

    @property
    def outstanding_amount(self) -> float:
        return float(self.total_amount) - float(self.paid_amount)

    @property
    def is_overdue(self) -> bool:
        from django.utils import timezone
        return self.status not in (InvoiceStatus.PAID, InvoiceStatus.CANCELLED) and \
               self.due_date < timezone.now().date()


class InvoiceLine(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    description = models.CharField(max_length=256)
    qty = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    line_total = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):  # type: ignore[override]
        self.line_total = self.qty * self.unit_price * (1 + self.tax_rate / 100)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.invoice.ref} / {self.description[:40]}"


class Payment(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=16, choices=PaymentMethod.choices, default=PaymentMethod.BANK)
    reference = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self) -> str:
        return f"Payment {self.amount} on {self.payment_date} for {self.invoice.ref}"
