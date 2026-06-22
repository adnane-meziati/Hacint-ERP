import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
import samples.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Sample',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('apn', models.CharField(db_index=True, max_length=50)),
                ('project', models.CharField(db_index=True, max_length=100)),
                ('placement', models.CharField(max_length=10, validators=[samples.models.validate_placement])),
                ('image', models.ImageField(blank=True, null=True, upload_to='samples/%Y/%m/')),
                ('thumbnail', models.ImageField(blank=True, null=True, upload_to='thumbnails/%Y/%m/')),
                ('received_date', models.DateField(default=django.utils.timezone.now)),
                ('client', models.CharField(choices=[('Aptiv', 'Aptiv'), ('Yazaki', 'Yazaki'), ('Lear', 'Lear'), ('Renault', 'Renault'), ('Stellantis', 'Stellantis'), ('Sumitomo', 'Sumitomo'), ('Other', 'Autre')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvé'), ('rejected', 'Rejeté'), ('archived', 'Archivé')], default='pending', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='samples_created', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='samples_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('create', 'Créé'), ('update', 'Modifié'), ('delete', 'Supprimé'), ('import', 'Importé'), ('export', 'Exporté')], max_length=10)),
                ('changes', models.JSONField(blank=True, default=dict)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('sample', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='samples.sample')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
    ]
