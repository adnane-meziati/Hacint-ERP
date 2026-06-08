import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("production", "0002_stageevent"),
        ("plm", "0001_initial"),
        ("sales", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkCenter",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=16, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("capacity_per_hour", models.DecimalField(decimal_places=2, default=1, max_digits=8)),
                ("setup_time_minutes", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="ManufacturingOrder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("planned_start", models.DateField(blank=True, null=True)),
                ("planned_end", models.DateField(blank=True, null=True)),
                ("actual_start", models.DateField(blank=True, null=True)),
                ("actual_end", models.DateField(blank=True, null=True)),
                ("qty_planned", models.DecimalField(decimal_places=3, default=1, max_digits=12)),
                ("qty_produced", models.DecimalField(decimal_places=3, default=0, max_digits=12)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("scheduled", "Scheduled"), ("in_progress", "In Progress"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="draft", max_length=16)),
                ("notes", models.TextField(blank=True)),
                ("bom", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="manufacturing_orders", to="plm.billofmaterials")),
                ("sales_order_line", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="manufacturing_orders", to="sales.salesorderline")),
                ("work_center", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="manufacturing_orders", to="production.workcenter")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-planned_start"]},
        ),
        migrations.CreateModel(
            name="Routing",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=128)),
                ("sequence", models.PositiveSmallIntegerField(default=10)),
                ("operation_description", models.TextField(blank=True)),
                ("standard_time_minutes", models.PositiveIntegerField(default=0)),
                ("bom", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="routings", to="plm.billofmaterials")),
                ("work_center", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="routings", to="production.workcenter")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["work_center", "sequence"]},
        ),
    ]
