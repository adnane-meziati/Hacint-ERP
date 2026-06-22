from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('samples', '0012_design_files'),
    ]
    operations = [
        migrations.AddField(
            model_name='sample',
            name='gcode_file',
            field=models.FileField(blank=True, null=True, upload_to='gcode/'),
        ),
        migrations.AddField(
            model_name='sample',
            name='gcode_uploaded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sample',
            name='gcode_uploaded_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='samples_gcode_upload', to=settings.AUTH_USER_MODEL),
        ),
    ]
