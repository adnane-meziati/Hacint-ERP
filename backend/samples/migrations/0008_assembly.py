from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('samples', '0007_cnc'),
    ]

    operations = [
        # CNC production count
        migrations.AddField(
            model_name='sample',
            name='cnc_produced_count',
            field=models.PositiveIntegerField(default=0),
        ),
        # Assembly rework flag
        migrations.AddField(
            model_name='sample',
            name='is_assembly_rework',
            field=models.BooleanField(default=False, db_index=True),
        ),
        # Assembly chronometer
        migrations.AddField(
            model_name='sample',
            name='assembly_status',
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
            name='assembly_time_started',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='assembly_time_spent_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='sample',
            name='assembly_pause_reason',
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
            name='assembly_locked_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_assembly_lock',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='sample',
            name='assembly_done',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='assembly_done_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='assembly_done_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_assembly_done',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Assembly production count
        migrations.AddField(
            model_name='sample',
            name='assembly_produced_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
