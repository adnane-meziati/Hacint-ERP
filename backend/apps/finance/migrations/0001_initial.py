import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("sales", "0001_initial"),
        ("purchase", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Account",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=32, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("account_type", models.CharField(choices=[("asset", "Asset"), ("liability", "Liability"), ("equity", "Equity"), ("revenue", "Revenue"), ("expense", "Expense")], max_length=16)),
                ("currency", models.CharField(default="MAD", max_length=8)),
                ("balance", models.DecimalField(decimal_places=2, default=0, max_digits=16)),
                ("is_active", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="Invoice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("invoice_type", models.CharField(choices=[("customer", "Customer Invoice"), ("vendor", "Vendor Invoice"), ("credit_note", "Credit Note")], default="customer", max_length=16)),
                ("issue_date", models.DateField()),
                ("due_date", models.DateField()),
                ("status", models.CharField(choices=[("draft", "Draft"), ("sent", "Sent"), ("paid", "Paid"), ("overdue", "Overdue"), ("partial", "Partially Paid"), ("cancelled", "Cancelled")], default="draft", max_length=16)),
                ("currency", models.CharField(default="MAD", max_length=8)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=16)),
                ("paid_amount", models.DecimalField(decimal_places=2, default=0, max_digits=16)),
                ("notes", models.TextField(blank=True)),
                ("customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="invoices", to="sales.customer")),
                ("vendor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="invoices", to="purchase.vendor")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-issue_date"]},
        ),
        migrations.CreateModel(
            name="InvoiceLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("description", models.CharField(max_length=256)),
                ("qty", models.DecimalField(decimal_places=3, default=1, max_digits=12)),
                ("unit_price", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("tax_rate", models.DecimalField(decimal_places=2, default=20, max_digits=5)),
                ("line_total", models.DecimalField(decimal_places=2, default=0, max_digits=16)),
                ("invoice", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="finance.invoice")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("payment_date", models.DateField()),
                ("payment_method", models.CharField(choices=[("bank", "Bank Transfer"), ("cash", "Cash"), ("check", "Check"), ("card", "Card")], default="bank", max_length=16)),
                ("reference", models.CharField(blank=True, max_length=64)),
                ("notes", models.TextField(blank=True)),
                ("invoice", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payments", to="finance.invoice")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-payment_date"]},
        ),
    ]
