import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("catalog", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BillOfMaterials",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("revision", models.CharField(default="A", max_length=16)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("active", "Active"), ("obsolete", "Obsolete")], default="draft", max_length=16)),
                ("description", models.TextField(blank=True)),
                ("article", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="boms", to="catalog.article")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Bill of Materials", "verbose_name_plural": "Bills of Materials"},
        ),
        migrations.AddConstraint(
            model_name="billofmaterials",
            constraint=models.UniqueConstraint(fields=["article", "revision"], name="unique_bom_revision"),
        ),
        migrations.CreateModel(
            name="BOMLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("qty", models.DecimalField(decimal_places=4, default=1, max_digits=12)),
                ("unit", models.CharField(default="pce", max_length=16)),
                ("notes", models.CharField(blank=True, max_length=256)),
                ("bom", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="plm.billofmaterials")),
                ("component", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="bom_usages", to="catalog.article")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"], "verbose_name": "BOM Line"},
        ),
        migrations.CreateModel(
            name="EngineeringChangeNotice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("title", models.CharField(max_length=256)),
                ("description", models.TextField()),
                ("status", models.CharField(choices=[("draft", "Draft"), ("under_review", "Under Review"), ("approved", "Approved"), ("rejected", "Rejected"), ("implemented", "Implemented")], default="draft", max_length=16)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")], default="medium", max_length=16)),
                ("effective_date", models.DateField(blank=True, null=True)),
                ("affected_bom", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ecns", to="plm.billofmaterials")),
                ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="ecn_requests", to=settings.AUTH_USER_MODEL)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ecn_approvals", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Engineering Change Notice", "verbose_name_plural": "Engineering Change Notices"},
        ),
    ]
