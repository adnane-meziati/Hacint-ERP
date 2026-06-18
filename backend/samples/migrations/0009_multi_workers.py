from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0008_assembly'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='cnc_active_workers',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='sample',
            name='assembly_active_workers',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
