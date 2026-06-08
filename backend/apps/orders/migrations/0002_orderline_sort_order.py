from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderline",
            name="sort_order",
            field=models.PositiveIntegerField(default=0, db_index=True),
        ),
        migrations.AlterModelOptions(
            name="orderline",
            options={"ordering": ["sort_order", "order__n_ordre", "n_serie"]},
        ),
    ]
