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
            name="Inspection",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("sales_order_ref", models.CharField(blank=True, max_length=32)),
                ("mo_ref", models.CharField(blank=True, max_length=32)),
                ("status", models.CharField(choices=[("planned", "Planned"), ("in_progress", "In Progress"), ("passed", "Passed"), ("failed", "Failed"), ("on_hold", "On Hold")], default="planned", max_length=16)),
                ("inspection_date", models.DateField()),
                ("notes", models.TextField(blank=True)),
                ("inspector", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="inspections", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-inspection_date"]},
        ),
        migrations.CreateModel(
            name="InspectionLine",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("checkpoint", models.CharField(max_length=256)),
                ("result", models.CharField(choices=[("pass", "Pass"), ("fail", "Fail"), ("na", "N/A")], default="na", max_length=8)),
                ("remarks", models.TextField(blank=True)),
                ("inspection", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="quality.inspection")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="NonConformity",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("description", models.TextField()),
                ("severity", models.CharField(choices=[("minor", "Minor"), ("major", "Major"), ("critical", "Critical")], default="minor", max_length=16)),
                ("status", models.CharField(choices=[("open", "Open"), ("under_review", "Under Review"), ("resolved", "Resolved"), ("closed", "Closed")], default="open", max_length=16)),
                ("notes", models.TextField(blank=True)),
                ("inspection", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ncrs", to="quality.inspection")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Non-Conformity", "verbose_name_plural": "Non-Conformities"},
        ),
        migrations.CreateModel(
            name="CAPA",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("action_type", models.CharField(choices=[("corrective", "Corrective"), ("preventive", "Preventive")], default="corrective", max_length=16)),
                ("description", models.TextField()),
                ("due_date", models.DateField()),
                ("status", models.CharField(choices=[("open", "Open"), ("in_progress", "In Progress"), ("completed", "Completed"), ("verified", "Verified")], default="open", max_length=16)),
                ("completion_notes", models.TextField(blank=True)),
                ("ncr", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="capas", to="quality.nonconformity")),
                ("assigned_to", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="capas", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["due_date"], "verbose_name": "CAPA", "verbose_name_plural": "CAPAs"},
        ),
        migrations.CreateModel(
            name="Audit",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref", models.CharField(max_length=32, unique=True)),
                ("audit_type", models.CharField(choices=[("internal", "Internal"), ("external", "External"), ("customer", "Customer")], default="internal", max_length=16)),
                ("scope", models.CharField(max_length=256)),
                ("auditor", models.CharField(max_length=128)),
                ("planned_date", models.DateField()),
                ("actual_date", models.DateField(blank=True, null=True)),
                ("status", models.CharField(choices=[("planned", "Planned"), ("in_progress", "In Progress"), ("completed", "Completed")], default="planned", max_length=16)),
                ("findings", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-planned_date"]},
        ),
    ]
