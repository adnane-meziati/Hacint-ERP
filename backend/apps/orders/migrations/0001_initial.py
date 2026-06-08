import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("catalog", "0001_initial"),
        ("production", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("n_ordre", models.PositiveIntegerField(unique=True)),
                ("creation_date", models.DateField()),
                ("delivery_date", models.DateField()),
                ("status", models.CharField(choices=[("en_cours", "En cours de production"), ("livree", "Livrée"), ("standby", "Stand-by")], default="en_cours", max_length=16)),
                ("notes", models.TextField(blank=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="catalog.client")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-n_ordre"]},
        ),
        migrations.CreateModel(
            name="OrderLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("n_serie", models.PositiveIntegerField()),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("priority", models.CharField(choices=[("urgent", "Urgent"), ("normal", "Normal"), ("faible", "Faible")], default="normal", max_length=16)),
                ("status", models.CharField(choices=[("en_cours", "En cours de production"), ("livree", "Livrée"), ("standby", "Stand-by")], default="en_cours", max_length=16)),
                ("comments", models.TextField(blank=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("article", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="order_lines", to="catalog.article")),
                ("current_stage", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="current_lines", to="production.stage")),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="orders.order")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["order__n_ordre", "n_serie"]},
        ),
        migrations.AddConstraint(
            model_name="orderline",
            constraint=models.UniqueConstraint(fields=["order", "n_serie"], name="unique_order_line"),
        ),
    ]
