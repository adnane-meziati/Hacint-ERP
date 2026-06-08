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
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(choices=[("create", "Create"), ("update", "Update"), ("delete", "Delete")], max_length=16)),
                ("object_id", models.CharField(max_length=64)),
                ("before_json", models.JSONField(blank=True, null=True)),
                ("after_json", models.JSONField(blank=True, null=True)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("content_type", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="contenttypes.contenttype")),
                ("user", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-timestamp"]},
        ),
    ]
