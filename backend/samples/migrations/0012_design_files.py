from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('samples', '0011_quality'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='design_file',
            field=models.FileField(blank=True, null=True, upload_to='designer/'),
        ),
        migrations.AddField(
            model_name='sample',
            name='design_pdf',
            field=models.FileField(blank=True, null=True, upload_to='designer/'),
        ),
        migrations.AddField(
            model_name='sample',
            name='design_uploaded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='design_uploaded_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='samples_design_upload',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
