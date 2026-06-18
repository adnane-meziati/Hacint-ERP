from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Catégorie ───────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Categorie',
            fields=[
                ('id',             models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code_categorie', models.CharField(db_index=True, max_length=50, unique=True)),
                ('nom',            models.CharField(max_length=200)),
                ('description',    models.TextField(blank=True)),
                ('parent',         models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sous_categories', to='storage.categorie',
                )),
            ],
            options={'ordering': ['nom'], 'verbose_name': 'Catégorie'},
        ),
        # ── Article ─────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Article',
            fields=[
                ('id',             models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code_article',   models.CharField(db_index=True, max_length=100, unique=True)),
                ('nom',            models.CharField(max_length=200)),
                ('description',    models.TextField(blank=True)),
                ('categorie',      models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='articles', to='storage.categorie',
                )),
                ('unite_mesure',   models.CharField(default='pcs', max_length=50)),
                ('prix_unitaire',  models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('duree_vie_jours', models.PositiveIntegerField(blank=True, null=True)),
                ('seuil_alerte',   models.PositiveIntegerField(default=0)),
                ('qr_code',        models.CharField(blank=True, max_length=200, null=True, unique=True)),
                ('code_barre',     models.CharField(blank=True, max_length=200, null=True, unique=True)),
                ('date_creation',  models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['code_article'], 'verbose_name': 'Article'},
        ),
        # ── Entrepôt ────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Entrepot',
            fields=[
                ('id',            models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code_entrepot', models.CharField(db_index=True, max_length=50, unique=True)),
                ('nom',           models.CharField(max_length=200)),
                ('adresse',       models.TextField(blank=True)),
                ('ville',         models.CharField(blank=True, max_length=100)),
                ('responsable',   models.CharField(blank=True, max_length=200)),
                ('capacite_max',  models.PositiveIntegerField(blank=True, null=True)),
                ('statut',        models.CharField(
                    choices=[('actif', 'Actif'), ('inactif', 'Inactif'), ('maintenance', 'Maintenance')],
                    default='actif', max_length=20,
                )),
            ],
            options={'ordering': ['nom'], 'verbose_name': 'Entrepôt'},
        ),
        # ── Placement ───────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Placement',
            fields=[
                ('id',               models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('entrepot',         models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='placements', to='storage.entrepot',
                )),
                ('code_emplacement', models.CharField(db_index=True, max_length=50)),
                ('zone',             models.CharField(blank=True, max_length=50)),
                ('allee',            models.CharField(blank=True, max_length=50)),
                ('niveau',           models.CharField(blank=True, max_length=50)),
                ('capacite_max',     models.PositiveIntegerField(blank=True, null=True)),
                ('statut',           models.CharField(
                    choices=[('disponible', 'Disponible'), ('plein', 'Plein'), ('bloque', 'Bloqué')],
                    default='disponible', max_length=20,
                )),
                ('qr_code',          models.CharField(blank=True, max_length=200, null=True, unique=True)),
            ],
            options={'ordering': ['entrepot', 'code_emplacement'], 'verbose_name': 'Placement'},
        ),
        migrations.AddConstraint(
            model_name='placement',
            constraint=models.UniqueConstraint(fields=['entrepot', 'code_emplacement'], name='unique_placement_code'),
        ),
        # ── Lot ─────────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Lot',
            fields=[
                ('id',               models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('article',          models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='lots', to='storage.article',
                )),
                ('numero_lot',       models.CharField(db_index=True, max_length=100)),
                ('date_fabrication', models.DateField(blank=True, null=True)),
                ('date_peremption',  models.DateField(blank=True, db_index=True, null=True)),
                ('quantite_initiale', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('statut',           models.CharField(
                    choices=[('actif', 'Actif'), ('perime', 'Périmé'), ('epuise', 'Épuisé')],
                    default='actif', max_length=20,
                )),
                ('qr_code',          models.CharField(blank=True, max_length=200, null=True, unique=True)),
            ],
            options={'ordering': ['date_peremption', 'numero_lot'], 'verbose_name': 'Lot'},
        ),
        migrations.AddConstraint(
            model_name='lot',
            constraint=models.UniqueConstraint(fields=['article', 'numero_lot'], name='unique_lot_article'),
        ),
        # ── Mouvement ───────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Mouvement',
            fields=[
                ('id',                   models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('article',              models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='mouvements', to='storage.article',
                )),
                ('lot',                  models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='mouvements', to='storage.lot',
                )),
                ('placement_source',     models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='mouvements_source', to='storage.placement',
                )),
                ('placement_destination', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='mouvements_destination', to='storage.placement',
                )),
                ('type_mouvement',       models.CharField(
                    choices=[('entree', 'Entrée'), ('sortie', 'Sortie'), ('transfert', 'Transfert'), ('ajustement', 'Ajustement')],
                    db_index=True, max_length=20,
                )),
                ('quantite',             models.DecimalField(decimal_places=2, max_digits=12)),
                ('date_mouvement',       models.DateTimeField(auto_now_add=True)),
                ('reference_document',   models.CharField(blank=True, max_length=200)),
                ('utilisateur',          models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='mouvements_stock', to=settings.AUTH_USER_MODEL,
                )),
                ('commentaire',          models.TextField(blank=True)),
            ],
            options={'ordering': ['-date_mouvement'], 'verbose_name': 'Mouvement'},
        ),
        # ── Stock ───────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Stock',
            fields=[
                ('id',                  models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('article',             models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='stocks', to='storage.article',
                )),
                ('placement',           models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='stocks', to='storage.placement',
                )),
                ('lot',                 models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stocks', to='storage.lot',
                )),
                ('quantite_disponible', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('derniere_maj',        models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['article', 'placement'], 'verbose_name': 'Stock'},
        ),
        # ── Ticket ──────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Ticket',
            fields=[
                ('id',               models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('qr_contenu',       models.TextField()),
                ('type_source',      models.CharField(
                    choices=[('article', 'Article'), ('lot', 'Lot'), ('placement', 'Placement')],
                    db_index=True, max_length=20,
                )),
                ('article',          models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tickets', to='storage.article',
                )),
                ('lot',              models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tickets', to='storage.lot',
                )),
                ('placement',        models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tickets', to='storage.placement',
                )),
                ('code_barre_genere', models.CharField(blank=True, max_length=200)),
                ('mouvement',        models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tickets', to='storage.mouvement',
                )),
                ('date_scan',        models.DateTimeField(auto_now_add=True)),
                ('utilisateur',      models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tickets_scan', to=settings.AUTH_USER_MODEL,
                )),
                ('statut',           models.CharField(
                    choices=[('genere', 'Généré'), ('imprime', 'Imprimé'), ('annule', 'Annulé')],
                    default='genere', max_length=20,
                )),
            ],
            options={'ordering': ['-date_scan'], 'verbose_name': 'Ticket'},
        ),
    ]
