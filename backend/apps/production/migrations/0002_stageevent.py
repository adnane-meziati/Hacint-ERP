import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("production", "0001_initial"),
        ("orders", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="StageEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("in_progress", "In progress"), ("done", "Done"), ("blocked", "Blocked")], default="pending", max_length=16)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("comment", models.TextField(blank=True)),
                ("completed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="completed_events", to=settings.AUTH_USER_MODEL)),
                ("line", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="orders.orderline")),
                ("stage", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="production.stage")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["line_id", "stage__sequence"]},
        ),
        migrations.AddConstraint(
            model_name="stageevent",
            constraint=models.UniqueConstraint(fields=["line", "stage"], name="unique_line_stage"),
        ),
    ]
