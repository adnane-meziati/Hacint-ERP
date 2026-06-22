import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0002_sample_quantity_connector_fill'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='is_done',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='done_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='done_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_done',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
