import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0006_asset_userasset'),
    ]

    operations = [
        migrations.AddField(
            model_name='asset',
            name='valeur_initiale',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=14,
                verbose_name='Valeur initiale (MAD)'),
        ),
        migrations.AddField(
            model_name='asset',
            name='duree_annees',
            field=models.PositiveIntegerField(
                default=1, verbose_name='Durée de vie (années)'),
        ),
        migrations.AddField(
            model_name='asset',
            name='date_debut',
            field=models.DateField(
                blank=True, null=True,
                verbose_name='Date de mise en service'),
        ),
        migrations.AlterField(
            model_name='asset',
            name='max_hours',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                validators=[django.core.validators.MinValueValidator(1)],
                verbose_name='Durée de vie maximale (heures)'),
        ),
    ]
