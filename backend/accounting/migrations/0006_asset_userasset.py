# Durée de vie des actifs — machines, PC, outils.
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0005_candidate_evaluation_contract_document_and_more'),
        ('accounting', '0005_seed_pcge_journaux'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Asset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('asset_type', models.CharField(choices=[('machine', 'Machine'), ('pc', 'PC'), ('tool', 'Outil')], default='machine', max_length=10)),
                ('max_hours', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)], verbose_name='Durée de vie maximale (heures)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assets', to='hr.department')),
            ],
            options={
                'verbose_name': 'Actif',
                'verbose_name_plural': 'Actifs',
                'ordering': ['department__name', 'name'],
            },
        ),
        migrations.CreateModel(
            name='UserAsset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='utilisateurs', to='accounting.asset')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='asset_assignments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Affectation utilisateur ↔ actif',
                'verbose_name_plural': 'Affectations utilisateur ↔ actif',
            },
        ),
        migrations.AlterUniqueTogether(
            name='userasset',
            unique_together={('user', 'asset')},
        ),
    ]
