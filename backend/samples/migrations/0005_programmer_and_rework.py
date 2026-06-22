import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


PAUSE_CHOICES = [
    ('manque_detail', 'Manque de détail'),
    ('rework',        'Rework'),
    ('technical',     'Problème technique'),
    ('lunch',         'Lunch'),
    ('clock_out',     'Clock out'),
]

STATUS_CHOICES = [
    ('ongoing', 'En cours'),
    ('standby', 'En pause'),
    ('done',    'Terminé'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0004_designer_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Designer pause reason + rework flag
        migrations.AddField(
            model_name='sample',
            name='pause_reason',
            field=models.CharField(blank=True, choices=PAUSE_CHOICES, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='is_rework',
            field=models.BooleanField(db_index=True, default=False),
        ),
        # Programmer chronometer
        migrations.AddField(
            model_name='sample',
            name='programmer_status',
            field=models.CharField(
                blank=True, choices=STATUS_CHOICES, db_index=True, max_length=10, null=True
            ),
        ),
        migrations.AddField(
            model_name='sample',
            name='programmer_time_started',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='programmer_time_spent_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='sample',
            name='programmer_pause_reason',
            field=models.CharField(blank=True, choices=PAUSE_CHOICES, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='programmer_done',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='sample',
            name='programmer_done_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='programmer_done_by',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_programmer_done', to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
