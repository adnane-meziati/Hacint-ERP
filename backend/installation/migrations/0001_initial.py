# Generated manually for HACINT Installation module
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InstallationProject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, default='')),
                ('name', models.CharField(max_length=180, unique=True)),
                ('client', models.CharField(max_length=160)),
                ('address', models.CharField(blank=True, default='', max_length=255)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('planned_end_date', models.DateField(blank=True, null=True)),
                ('supervisor', models.CharField(blank=True, default='', max_length=160)),
                ('status', models.CharField(choices=[('En attente', 'En attente'), ('En cours', 'En cours'), ('Suspendu', 'Suspendu'), ('Terminé', 'Terminé'), ('Annulé', 'Annulé')], default='En attente', max_length=40)),
                ('description', models.TextField(blank=True, default='')),
                ('budget', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('progress', models.PositiveIntegerField(default=0)),
            ],
            options={'ordering': ['-id']},
        ),
        migrations.CreateModel(
            name='InstallationProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, default='')),
                ('reference', models.CharField(max_length=80, unique=True)),
                ('name', models.CharField(blank=True, default='', max_length=180)),
                ('description', models.TextField()),
                ('date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(blank=True, default='Actif', max_length=60)),
                ('image', models.ImageField(blank=True, null=True, upload_to='installation/products/images/')),
                ('file', models.FileField(blank=True, null=True, upload_to='installation/products/files/')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to='installation.installationproject')),
            ],
            options={'ordering': ['-id']},
        ),
        migrations.CreateModel(
            name='InstallationTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, default='')),
                ('name', models.CharField(max_length=180)),
                ('description', models.TextField(blank=True, default='')),
                ('status', models.CharField(choices=[('À faire', 'À faire'), ('En cours', 'En cours'), ('Bloquée', 'Bloquée'), ('Terminée', 'Terminée')], default='À faire', max_length=40)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('priority', models.CharField(choices=[('Critique', 'Critique'), ('Haute', 'Haute'), ('Moyenne', 'Moyenne'), ('Basse', 'Basse')], default='Moyenne', max_length=40)),
                ('comment', models.TextField(blank=True, default='')),
                ('attachment', models.FileField(blank=True, null=True, upload_to='installation/tasks/')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tasks', to='installation.installationproject')),
            ],
            options={'ordering': ['due_date', '-id']},
        ),
        migrations.CreateModel(
            name='InstallationDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, default='')),
                ('title', models.CharField(max_length=180)),
                ('document_type', models.CharField(blank=True, default='Document', max_length=80)),
                ('file', models.FileField(blank=True, null=True, upload_to='installation/documents/')),
                ('status', models.CharField(blank=True, default='Valide', max_length=60)),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents', to='installation.installationproject')),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-id']},
        ),
        migrations.CreateModel(
            name='InstallationReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, default='')),
                ('reference', models.CharField(max_length=80, unique=True)),
                ('title', models.CharField(max_length=180)),
                ('report_type', models.CharField(blank=True, default='Rapport projet', max_length=80)),
                ('summary', models.TextField(blank=True, default='')),
                ('status', models.CharField(blank=True, default='Généré', max_length=60)),
                ('generated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reports', to='installation.installationproject')),
            ],
            options={'ordering': ['-id']},
        ),
        migrations.CreateModel(
            name='InstallationNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notes', models.TextField(blank=True, default='')),
                ('title', models.CharField(max_length=180)),
                ('message', models.TextField(blank=True, default='')),
                ('level', models.CharField(blank=True, default='Info', max_length=40)),
                ('is_read', models.BooleanField(default=False)),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notifications', to='installation.installationproject')),
            ],
            options={'ordering': ['-id']},
        ),
    ]
