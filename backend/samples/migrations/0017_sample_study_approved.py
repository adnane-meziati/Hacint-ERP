from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0016_validation'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='study_approved',
            field=models.BooleanField(default=False, db_index=True),
        ),
    ]
