from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='quantity',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='sample',
            name='connector_fill',
            field=models.CharField(
                choices=[
                    ('full',    'Complet (toutes broches)'),
                    ('empty',   'Vide (aucune broche)'),
                    ('partial', 'Partiel (broches partielles)'),
                ],
                default='empty',
                max_length=10,
            ),
        ),
    ]
