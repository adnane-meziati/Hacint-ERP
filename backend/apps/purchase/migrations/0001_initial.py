import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Vendor",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=128)),
                ("code", models.CharField(max_length=32, unique=True)),
                ("country", models.CharField(blank=True, max_length=64)),
                ("address", models.TextField(blank=True)),
                ("contact_name", models.CharField(blank=True, max_length=128)),
                ("contact_email", models.EmailField(blank=True, max_length=254)),
                ("contact_phone", models.CharField(blank=True, max_length=32)),
                ("payment_terms", models.CharField(blank=True, max_length=64)),
                ("currency", models.CharField(default="MAD", max_length=8)),
                ("status", models.CharField(choices=[("active", "Active"), ("inactive", "Inactive"), ("blacklisted", "Blacklisted")], default="active", max_length=16)),
                ("notes", models.TextField(blank=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="RFQ",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("sent", "Sent"), ("received", "Received"), ("cancelled", "Cancelled")], default="draft", max_length=16)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("vendor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="rfqs", to="purchase.vendor")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="RFQLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("description", models.CharField(max_length=256)),
                ("qty", models.DecimalField(decimal_places=3, default=1, max_digits=12)),
                ("unit", models.CharField(default="pce", max_length=16)),
                ("estimated_unit_price", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("rfq", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="purchase.rfq")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="PurchaseOrder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("expected_date", models.DateField(blank=True, null=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("confirmed", "Confirmed"), ("partial", "Partially Received"), ("received", "Fully Received"), ("cancelled", "Cancelled")], default="draft", max_length=16)),
                ("currency", models.CharField(default="MAD", max_length=8)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("notes", models.TextField(blank=True)),
                ("vendor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="purchase_orders", to="purchase.vendor")),
                ("rfq", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="purchase_orders", to="purchase.rfq")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PurchaseOrderLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("item_sku", models.CharField(blank=True, max_length=64)),
                ("description", models.CharField(max_length=256)),
                ("qty", models.DecimalField(decimal_places=3, default=1, max_digits=12)),
                ("unit", models.CharField(default="pce", max_length=16)),
                ("unit_price", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("received_qty", models.DecimalField(decimal_places=3, default=0, max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="purchase.purchaseorder")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="Receipt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("received_date", models.DateField()),
                ("notes", models.TextField(blank=True)),
                ("purchase_order", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="receipts", to="purchase.purchaseorder")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-received_date"]},
        ),
        migrations.CreateModel(
            name="ReceiptLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("qty_received", models.DecimalField(decimal_places=3, max_digits=12)),
                ("notes", models.CharField(blank=True, max_length=256)),
                ("receipt", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="purchase.receipt")),
                ("po_line", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="receipt_lines", to="purchase.purchaseorderline")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
