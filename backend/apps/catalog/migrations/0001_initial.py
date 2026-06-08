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
            name="Client",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=32, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("country", models.CharField(blank=True, max_length=64)),
                ("contact_email", models.EmailField(blank=True)),
                ("logo", models.ImageField(blank=True, upload_to="clients/")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="Family",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=32, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["code"], "verbose_name_plural": "families"},
        ),
        migrations.CreateModel(
            name="Article",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ref_client", models.CharField(max_length=128, unique=True)),
                ("description", models.CharField(max_length=255)),
                ("notes", models.TextField(blank=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("family", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="articles", to="catalog.family")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["ref_client"]},
        ),
        migrations.CreateModel(
            name="ArticleRevision",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("revision_no", models.CharField(max_length=16)),
                ("effective_date", models.DateField()),
                ("drawing_pdf", models.FileField(blank=True, upload_to="drawings/")),
                ("cam_archive", models.FileField(blank=True, upload_to="cam/")),
                ("notes", models.TextField(blank=True)),
                ("article", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="revisions", to="catalog.article")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-effective_date"]},
        ),
        migrations.AddConstraint(
            model_name="articlerevision",
            constraint=models.UniqueConstraint(fields=["article", "revision_no"], name="unique_article_revision"),
        ),
    ]
