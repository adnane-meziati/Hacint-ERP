from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('samples', '0020_sample_commentaire'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='bom_pdf',
            field=models.FileField(blank=True, null=True, upload_to='bom/'),
        ),
        migrations.AddField(
            model_name='sample',
            name='bom_uploaded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='BomItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference', models.CharField(max_length=100)),
                ('designation', models.CharField(blank=True, max_length=200)),
                ('quantity', models.DecimalField(decimal_places=3, default=1, max_digits=10)),
                ('unit', models.CharField(
                    choices=[('pcs', 'Pièces'), ('m', 'Mètre'), ('m2', 'Mètre²'),
                             ('kg', 'Kilogramme'), ('g', 'Gramme'), ('l', 'Litre'), ('mm', 'Millimètre')],
                    default='pcs', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sample', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                             related_name='bom_items', to='samples.sample')),
            ],
            options={'ordering': ['reference']},
        ),
    ]
