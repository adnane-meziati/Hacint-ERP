import random
from django.db import migrations, models


def assign_serials_to_existing(apps, schema_editor):
    """Give every existing sample a unique serial number in 1-1000 range."""
    Sample = apps.get_model('samples', 'Sample')
    used = set()
    for sample in Sample.objects.filter(serial_number__isnull=True).order_by('id'):
        # Build pool from 1-1000 minus already used
        pool = [n for n in range(1, 1001) if n not in used]
        if not pool:
            pool = [n for n in range(1001, 10000) if n not in used]
        if not pool:
            pool = [max(used) + 1] if used else [1]
        sn = random.choice(pool)
        sample.serial_number = sn
        sample.save(update_fields=['serial_number'])
        used.add(sn)


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0009_multi_workers'),
    ]

    operations = [
        # 1. Add nullable column first (so DB accepts existing rows)
        migrations.AddField(
            model_name='sample',
            name='serial_number',
            field=models.IntegerField(blank=True, null=True),
        ),
        # 2. Fill existing rows
        migrations.RunPython(assign_serials_to_existing, migrations.RunPython.noop),
        # 3. Apply unique constraint (all rows now have a value)
        migrations.AlterField(
            model_name='sample',
            name='serial_number',
            field=models.IntegerField(blank=True, null=True, unique=True),
        ),
    ]
