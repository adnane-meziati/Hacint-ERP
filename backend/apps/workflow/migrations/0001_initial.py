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
            name="Project",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=32, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(
                    choices=[("active", "Actif"), ("completed", "Terminé"), ("cancelled", "Annulé")],
                    db_index=True,
                    default="active",
                    max_length=16,
                )),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
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
        migrations.CreateModel(
            name="WorkflowOrder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("order_number", models.CharField(max_length=64, unique=True)),
                ("order_date", models.DateField()),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(
                    choices=[("pending", "En attente"), ("in_progress", "En cours"), ("completed", "Terminé"), ("cancelled", "Annulé")],
                    db_index=True,
                    default="pending",
                    max_length=16,
                )),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("project", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="orders",
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
            options={"ordering": ["project_id", "order_number"]},
        ),
        migrations.CreateModel(
            name="Apn",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("apn_code", models.CharField(max_length=128)),
                ("specification", models.TextField(blank=True)),
                ("priority", models.CharField(
                    choices=[("low", "Faible"), ("normal", "Normal"), ("high", "Haute"), ("urgent", "Urgent")],
                    default="normal",
                    max_length=8,
                )),
                ("has_sample", models.BooleanField(default=False)),
                ("current_stage", models.CharField(
                    choices=[
                        ("technical_study", "Étude Technique"),
                        ("designer", "Dessin"),
                        ("programmer", "Programmation"),
                        ("cnc", "CNC"),
                        ("qc", "Contrôle Qualité"),
                        ("production", "Production"),
                        ("done", "Terminé"),
                    ],
                    db_index=True,
                    default="technical_study",
                    max_length=20,
                )),
                ("work_order", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="apns",
                    to="workflow.workfloworder",
                )),
                ("assigned_user", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="assigned_apns",
                    to=settings.AUTH_USER_MODEL,
                    db_index=True,
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
            options={"ordering": ["work_order_id", "apn_code"]},
        ),
        migrations.AddConstraint(
            model_name="apn",
            constraint=models.UniqueConstraint(
                fields=["work_order", "apn_code"],
                name="workflow_apn_work_order_apn_code_uniq",
            ),
        ),
        migrations.CreateModel(
            name="ApnStageHistory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("from_stage", models.CharField(
                    blank=True,
                    choices=[
                        ("technical_study", "Étude Technique"),
                        ("designer", "Dessin"),
                        ("programmer", "Programmation"),
                        ("cnc", "CNC"),
                        ("qc", "Contrôle Qualité"),
                        ("production", "Production"),
                        ("done", "Terminé"),
                    ],
                    max_length=20,
                    null=True,
                )),
                ("to_stage", models.CharField(
                    choices=[
                        ("technical_study", "Étude Technique"),
                        ("designer", "Dessin"),
                        ("programmer", "Programmation"),
                        ("cnc", "CNC"),
                        ("qc", "Contrôle Qualité"),
                        ("production", "Production"),
                        ("done", "Terminé"),
                    ],
                    max_length=20,
                )),
                ("comment", models.TextField(blank=True)),
                ("apn", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="history",
                    to="workflow.apn",
                )),
                ("transitioned_by", models.ForeignKey(
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
            options={"ordering": ["apn_id", "created_at"]},
        ),
        migrations.CreateModel(
            name="ApnAttachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("attachment_type", models.CharField(
                    choices=[("pdf", "PDF"), ("g_code", "G-Code"), ("excel", "Excel"), ("other", "Autre")],
                    max_length=8,
                )),
                ("file", models.FileField(upload_to="workflow/attachments/%Y/%m/")),
                ("original_name", models.CharField(max_length=255)),
                ("size_bytes", models.PositiveBigIntegerField()),
                ("stage_at_upload", models.CharField(
                    blank=True,
                    choices=[
                        ("technical_study", "Étude Technique"),
                        ("designer", "Dessin"),
                        ("programmer", "Programmation"),
                        ("cnc", "CNC"),
                        ("qc", "Contrôle Qualité"),
                        ("production", "Production"),
                        ("done", "Terminé"),
                    ],
                    max_length=20,
                    null=True,
                )),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("apn", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="attachments",
                    to="workflow.apn",
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
            options={"ordering": ["apn_id", "-created_at"]},
        ),
    ]
