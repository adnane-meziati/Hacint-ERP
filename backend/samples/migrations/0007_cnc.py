from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('samples', '0006_locked_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='is_cnc_rework',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_status',
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
            name='cnc_time_started',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_time_spent_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_pause_reason',
            field=models.CharField(
                blank=True,
                choices=[
                    ('manque_detail', 'Manque de détail'),
                    ('rework', 'Rework'),
                    ('technical', 'Problème technique'),
                    ('lunch', 'Lunch'),
                    ('clock_out', 'Clock out'),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_locked_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_cnc_lock',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_done',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_done_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='cnc_done_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_cnc_done',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
