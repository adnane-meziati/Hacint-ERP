import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workflow", "0002_remove_apn_workflow_apn_work_order_apn_code_uniq_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add validation_status to Project
        migrations.AddField(
            model_name="project",
            name="validation_status",
            field=models.CharField(
                choices=[("pending", "En attente"), ("approved", "Validé"), ("rejected", "Rejeté")],
                db_index=True,
                default="pending",
                max_length=16,
            ),
        ),
        # Reference matrix
        migrations.CreateModel(
            name="MatrixSample",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reference", models.CharField(max_length=128, unique=True)),
                ("designation", models.CharField(blank=True, max_length=255)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("sample_type", models.CharField(blank=True, max_length=64)),
                ("notes", models.TextField(blank=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["reference"]},
        ),
        # Project samples
        migrations.CreateModel(
            name="ProjectSample",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reference", models.CharField(max_length=128)),
                ("designation", models.CharField(blank=True, max_length=255)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("sample_type", models.CharField(blank=True, max_length=64)),
                ("notes", models.TextField(blank=True)),
                ("project", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="samples",
                    to="workflow.project",
                )),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["project_id", "reference"]},
        ),
        migrations.AlterUniqueTogether(
            name="projectsample",
            unique_together={("project", "reference")},
        ),
        # Project validation result
        migrations.CreateModel(
            name="ProjectValidation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("validation_status", models.CharField(
                    choices=[("pending", "En attente"), ("approved", "Validé"), ("rejected", "Rejeté")],
                    db_index=True,
                    default="pending",
                    max_length=16,
                )),
                ("validated_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("result", models.JSONField(default=dict)),
                ("project", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="validation",
                    to="workflow.project",
                )),
                ("validated_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("approved_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
