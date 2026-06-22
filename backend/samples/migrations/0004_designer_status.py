from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0003_sample_done_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='designer_status',
            field=models.CharField(
                blank=True,
                choices=[('ongoing', 'En cours'), ('standby', 'En pause'), ('done', 'Terminé')],
                db_index=True,
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='sample',
            name='time_started',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='time_spent_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
