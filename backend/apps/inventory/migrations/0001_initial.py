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
            name="Warehouse",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=128)),
                ("code", models.CharField(max_length=16, unique=True)),
                ("address", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Location",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=32)),
                ("name", models.CharField(blank=True, max_length=128)),
                ("location_type", models.CharField(choices=[("rack", "Rack"), ("shelf", "Shelf"), ("bin", "Bin"), ("floor", "Floor")], default="bin", max_length=16)),
                ("is_active", models.BooleanField(default=True)),
                ("warehouse", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="locations", to="inventory.warehouse")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["warehouse", "code"]},
        ),
        migrations.AddConstraint(
            model_name="location",
            constraint=models.UniqueConstraint(fields=["warehouse", "code"], name="unique_location"),
        ),
        migrations.CreateModel(
            name="Item",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sku", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=256)),
                ("description", models.TextField(blank=True)),
                ("category", models.CharField(blank=True, max_length=64)),
                ("unit_of_measure", models.CharField(default="pce", max_length=16)),
                ("reorder_point", models.DecimalField(decimal_places=3, default=0, max_digits=12)),
                ("lead_time_days", models.PositiveSmallIntegerField(default=0)),
                ("unit_cost", models.DecimalField(decimal_places=4, default=0, max_digits=14)),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["sku"]},
        ),
        migrations.CreateModel(
            name="StockMovement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("qty", models.DecimalField(decimal_places=3, max_digits=12)),
                ("movement_type", models.CharField(choices=[("receipt", "Receipt"), ("issue", "Issue"), ("transfer", "Transfer"), ("adjustment", "Adjustment"), ("return", "Return")], max_length=16)),
                ("reference", models.CharField(blank=True, max_length=64)),
                ("notes", models.TextField(blank=True)),
                ("item", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="movements", to="inventory.item")),
                ("from_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="outgoing_movements", to="inventory.location")),
                ("to_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="incoming_movements", to="inventory.location")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
