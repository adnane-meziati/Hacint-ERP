import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Attachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("object_id", models.UUIDField()),
                ("kind", models.CharField(choices=[("drawing", "Drawing (PDF)"), ("cam", "CAM file"), ("photo", "Photo"), ("report", "Report"), ("other", "Other")], max_length=16)),
                ("file", models.FileField(upload_to="attachments/%Y/%m/")),
                ("original_name", models.CharField(max_length=255)),
                ("size_bytes", models.PositiveBigIntegerField()),
                ("mime", models.CharField(max_length=128)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("content_type", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="contenttypes.contenttype")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="attachment",
            index=models.Index(fields=["content_type", "object_id"], name="attachment_ct_obj_idx"),
        ),
    ]
