from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0010_serial_number'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='sample', name='is_quality_rework',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='sample', name='quality_status',
            field=models.CharField(
                blank=True,
                choices=[('ongoing', 'En cours'), ('standby', 'En pause'), ('done', 'Terminé')],
                db_index=True, max_length=10, null=True,
            ),
        ),
        migrations.AddField(
            model_name='sample', name='quality_time_started',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample', name='quality_time_spent_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='sample', name='quality_pause_reason',
            field=models.CharField(
                blank=True,
                choices=[
                    ('manque_detail', 'Manque de détail'), ('rework', 'Rework'),
                    ('technical', 'Problème technique'), ('lunch', 'Lunch'),
                    ('clock_out', 'Clock out'),
                ],
                max_length=20, null=True,
            ),
        ),
        migrations.AddField(
            model_name='sample', name='quality_done',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='sample', name='quality_done_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample', name='quality_done_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_quality_done',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='sample', name='quality_active_workers',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
