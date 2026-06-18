#!/usr/bin/env python
"""
Seed script — données de démonstration pour le module Stockage.
Run with: python seed2.py  (inside the Docker container or with venv active)
"""
import os, sys, django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.contrib.auth.models import User
from django.db import transaction
from storage.models import (
    Categorie, Article, Entrepot, Placement,
    Lot, Mouvement, Stock, Ticket,
)

admin = User.objects.filter(is_superuser=True).first()
today = date.today()

# ── 1. Catégories ─────────────────────────────────────────────────────────────
print("Catégories...")
cat_data = [
    ('CAT-CONN',  'Connecteurs',        None),
    ('CAT-CABLE', 'Câbles',             None),
    ('CAT-TERM',  'Terminaux',          None),
    ('CAT-SEEL',  'Joints / Étanchéité', None),
    ('CAT-CONN-2', 'Connecteurs 2.8mm', 'CAT-CONN'),
    ('CAT-CONN-6', 'Connecteurs 6.3mm', 'CAT-CONN'),
    ('CAT-CONN-HT', 'Connecteurs HT',  'CAT-CONN'),
]
cats = {}
for code, nom, parent_code in cat_data:
    parent = cats.get(parent_code)
    c, _ = Categorie.objects.get_or_create(
        code_categorie=code,
        defaults={'nom': nom, 'parent': parent},
    )
    cats[code] = c
print(f"  {len(cats)} catégories")

# ── 2. Articles ───────────────────────────────────────────────────────────────
print("Articles...")
articles_data = [
    ('ART-CON-001', 'Connecteur 12 voies 2.8mm mâle',      'CAT-CONN-2',  'pcs',   1.85, None,  50),
    ('ART-CON-002', 'Connecteur 12 voies 2.8mm femelle',   'CAT-CONN-2',  'pcs',   2.10, None,  50),
    ('ART-CON-003', 'Connecteur 6 voies 6.3mm mâle',       'CAT-CONN-6',  'pcs',   3.20, None,  30),
    ('ART-CON-004', 'Connecteur 6 voies 6.3mm femelle',    'CAT-CONN-6',  'pcs',   3.50, None,  30),
    ('ART-CON-005', 'Connecteur HT 800V 3 voies',          'CAT-CONN-HT', 'pcs',  18.00, None,  10),
    ('ART-CON-006', 'Connecteur HT 800V 6 voies',          'CAT-CONN-HT', 'pcs',  24.00, None,  10),
    ('ART-CAB-001', 'Câble 0.35mm² rouge (au mètre)',      'CAT-CABLE',   'm',     0.45, None, 100),
    ('ART-CAB-002', 'Câble 0.35mm² noir (au mètre)',       'CAT-CABLE',   'm',     0.45, None, 100),
    ('ART-CAB-003', 'Câble 0.75mm² rouge (au mètre)',      'CAT-CABLE',   'm',     0.72, None, 100),
    ('ART-CAB-004', 'Câble HT 2.5mm² orange (au mètre)',   'CAT-CABLE',   'm',     2.30, None,  50),
    ('ART-TRM-001', 'Terminal femelle 2.8mm étamé',        'CAT-TERM',    'pcs',   0.12, None, 500),
    ('ART-TRM-002', 'Terminal mâle 2.8mm étamé',           'CAT-TERM',    'pcs',   0.10, None, 500),
    ('ART-TRM-003', 'Terminal femelle 6.3mm étamé',        'CAT-TERM',    'pcs',   0.18, None, 500),
    ('ART-SEE-001', 'Joint silicone 2.8mm (rouge)',        'CAT-SEEL',    'pcs',   0.08, 730,  200),
    ('ART-SEE-002', 'Joint silicone 2.8mm (bleu)',         'CAT-SEEL',    'pcs',   0.08, 730,  200),
    ('ART-SEE-003', 'Bouchon d\'étanchéité 2.8mm',        'CAT-SEEL',    'pcs',   0.05, 365,  300),
]
arts = {}
for code, nom, cat_code, unite, prix, duree, seuil in articles_data:
    a, _ = Article.objects.get_or_create(
        code_article=code,
        defaults={
            'nom': nom, 'categorie': cats.get(cat_code),
            'unite_mesure': unite, 'prix_unitaire': Decimal(str(prix)),
            'duree_vie_jours': duree, 'seuil_alerte': seuil,
        },
    )
    arts[code] = a
print(f"  {len(arts)} articles")

# ── 3. Entrepôts ──────────────────────────────────────────────────────────────
print("Entrepôts...")
entrepots_data = [
    ('ENT-PRINC', 'Entrepôt Principal',   'Zone Industrielle Nord, Bâtiment A', 'Tanger',     'Mohamed Alami',  5000),
    ('ENT-SECON', 'Stock Secondaire',     'Rue des Ateliers, Hall 3',           'Tanger',     'Fatima Benali',  1200),
    ('ENT-QUART', 'Zone Quarantaine',     'Bâtiment A - Aile Est',              'Tanger',     'Youssef Idrissi', 200),
]
entrepots = {}
for code, nom, adresse, ville, resp, cap in entrepots_data:
    e, _ = Entrepot.objects.get_or_create(
        code_entrepot=code,
        defaults={'nom': nom, 'adresse': adresse, 'ville': ville, 'responsable': resp, 'capacite_max': cap},
    )
    entrepots[code] = e
print(f"  {len(entrepots)} entrepôts")

# ── 4. Placements ─────────────────────────────────────────────────────────────
print("Placements...")
placements_data = [
    # Entrepôt principal
    ('ENT-PRINC', 'A-01-01', 'A', '01', '01', 200),
    ('ENT-PRINC', 'A-01-02', 'A', '01', '02', 200),
    ('ENT-PRINC', 'A-02-01', 'A', '02', '01', 200),
    ('ENT-PRINC', 'A-02-02', 'A', '02', '02', 200),
    ('ENT-PRINC', 'B-01-01', 'B', '01', '01', 500),
    ('ENT-PRINC', 'B-01-02', 'B', '01', '02', 500),
    ('ENT-PRINC', 'B-02-01', 'B', '02', '01', 500),
    ('ENT-PRINC', 'C-01-01', 'C', '01', '01', 300),
    ('ENT-PRINC', 'C-01-02', 'C', '01', '02', 300),
    ('ENT-PRINC', 'C-02-01', 'C', '02', '01', 300),
    # Stock secondaire
    ('ENT-SECON', 'S-01-01', 'S', '01', '01', 150),
    ('ENT-SECON', 'S-01-02', 'S', '01', '02', 150),
    ('ENT-SECON', 'S-02-01', 'S', '02', '01', 150),
    # Quarantaine
    ('ENT-QUART', 'Q-01-01', 'Q', '01', '01',  50),
    ('ENT-QUART', 'Q-01-02', 'Q', '01', '02',  50),
]
placements = {}
for ent_code, code_empl, zone, allee, niveau, cap in placements_data:
    p, _ = Placement.objects.get_or_create(
        entrepot=entrepots[ent_code],
        code_emplacement=code_empl,
        defaults={'zone': zone, 'allee': allee, 'niveau': niveau, 'capacite_max': cap},
    )
    placements[(ent_code, code_empl)] = p
print(f"  {len(placements)} placements")

# ── 5. Lots ───────────────────────────────────────────────────────────────────
print("Lots...")
lots_data = [
    ('ART-CON-001', 'LOT-2024-001', date(2024,  1, 10), None,                   500,  'actif'),
    ('ART-CON-001', 'LOT-2024-088', date(2024,  8, 20), None,                   300,  'actif'),
    ('ART-CON-002', 'LOT-2024-010', date(2024,  2,  5), None,                   400,  'actif'),
    ('ART-CON-003', 'LOT-2024-022', date(2024,  3, 15), None,                   200,  'actif'),
    ('ART-CON-004', 'LOT-2024-033', date(2024,  4,  1), None,                   200,  'actif'),
    ('ART-CON-005', 'LOT-2024-055', date(2024,  6, 12), None,                    50,  'actif'),
    ('ART-CON-006', 'LOT-2024-066', date(2024,  7,  8), None,                    50,  'actif'),
    ('ART-CAB-001', 'LOT-2024-CAB-01', date(2024, 1, 1), None,                 2000,  'actif'),
    ('ART-CAB-002', 'LOT-2024-CAB-02', date(2024, 1, 1), None,                 2000,  'actif'),
    ('ART-CAB-003', 'LOT-2024-CAB-03', date(2024, 3, 1), None,                 1500,  'actif'),
    ('ART-CAB-004', 'LOT-2024-CAB-HT', date(2024, 5, 1), None,                  800,  'actif'),
    ('ART-TRM-001', 'LOT-2024-TRM-01', date(2024, 1,15), None,               10000,  'actif'),
    ('ART-TRM-002', 'LOT-2024-TRM-02', date(2024, 1,15), None,               10000,  'actif'),
    ('ART-TRM-003', 'LOT-2024-TRM-03', date(2024, 2, 1), None,                5000,  'actif'),
    # Lots avec date de péremption (joints)
    ('ART-SEE-001', 'LOT-SEE-2024-A', date(2024, 1, 1), today + timedelta(days=180), 5000, 'actif'),
    ('ART-SEE-002', 'LOT-SEE-2024-B', date(2024, 2, 1), today + timedelta(days=90),  5000, 'actif'),
    ('ART-SEE-003', 'LOT-SEE-2024-C', date(2024, 3, 1), today + timedelta(days=20),  8000, 'actif'),  # expiration proche !
    ('ART-SEE-001', 'LOT-SEE-2023-X', date(2023, 6, 1), today - timedelta(days=30),  1000, 'perime'), # périmé
]
lots = {}
for art_code, num_lot, date_fab, date_per, qte, statut in lots_data:
    l, _ = Lot.objects.get_or_create(
        article=arts[art_code],
        numero_lot=num_lot,
        defaults={
            'date_fabrication': date_fab, 'date_peremption': date_per,
            'quantite_initiale': Decimal(str(qte)), 'statut': statut,
        },
    )
    lots[(art_code, num_lot)] = l
print(f"  {len(lots)} lots")

# ── 6. Mouvements + Stocks ────────────────────────────────────────────────────
print("Mouvements & Stocks...")

def entree(article_key, lot_key, placement_key, qte, ref='', comment=''):
    art = arts[article_key]
    lot = lots.get(lot_key)
    pl  = placements[placement_key]
    with transaction.atomic():
        mv = Mouvement.objects.create(
            article=art, lot=lot, placement_destination=pl,
            type_mouvement='entree', quantite=Decimal(str(qte)),
            reference_document=ref, commentaire=comment, utilisateur=admin,
        )
        stock, _ = Stock.objects.get_or_create(
            article=art, placement=pl, lot=lot,
            defaults={'quantite_disponible': Decimal('0')},
        )
        stock.quantite_disponible += Decimal(str(qte))
        stock.save()

def sortie(article_key, lot_key, placement_key, qte, ref='', comment=''):
    art = arts[article_key]
    lot = lots.get(lot_key)
    pl  = placements[placement_key]
    with transaction.atomic():
        Mouvement.objects.create(
            article=art, lot=lot, placement_source=pl,
            type_mouvement='sortie', quantite=Decimal(str(qte)),
            reference_document=ref, commentaire=comment, utilisateur=admin,
        )
        try:
            stock = Stock.objects.get(article=art, placement=pl, lot=lot)
            stock.quantite_disponible = max(Decimal('0'), stock.quantite_disponible - Decimal(str(qte)))
            stock.save()
        except Stock.DoesNotExist:
            pass

def transfert(article_key, lot_key, src_key, dst_key, qte, ref=''):
    art = arts[article_key]
    lot = lots.get(lot_key)
    src = placements[src_key]
    dst = placements[dst_key]
    with transaction.atomic():
        Mouvement.objects.create(
            article=art, lot=lot, placement_source=src, placement_destination=dst,
            type_mouvement='transfert', quantite=Decimal(str(qte)),
            reference_document=ref, utilisateur=admin,
        )
        try:
            s = Stock.objects.get(article=art, placement=src, lot=lot)
            s.quantite_disponible = max(Decimal('0'), s.quantite_disponible - Decimal(str(qte)))
            s.save()
        except Stock.DoesNotExist:
            pass
        d, _ = Stock.objects.get_or_create(
            article=art, placement=dst, lot=lot,
            defaults={'quantite_disponible': Decimal('0')},
        )
        d.quantite_disponible += Decimal(str(qte))
        d.save()

# Connecteurs — entrées initiales
entree('ART-CON-001', ('ART-CON-001','LOT-2024-001'), ('ENT-PRINC','A-01-01'), 300, 'BL-2024-001', 'Réception fournisseur Tyco')
entree('ART-CON-001', ('ART-CON-001','LOT-2024-088'), ('ENT-PRINC','A-01-02'), 300, 'BL-2024-088')
entree('ART-CON-002', ('ART-CON-002','LOT-2024-010'), ('ENT-PRINC','A-02-01'), 400, 'BL-2024-010')
entree('ART-CON-003', ('ART-CON-003','LOT-2024-022'), ('ENT-PRINC','B-01-01'), 200, 'BL-2024-022')
entree('ART-CON-004', ('ART-CON-004','LOT-2024-033'), ('ENT-PRINC','B-01-02'), 200, 'BL-2024-033')
entree('ART-CON-005', ('ART-CON-005','LOT-2024-055'), ('ENT-PRINC','B-02-01'),  50, 'BL-2024-055', 'Connecteurs haute tension EV')
entree('ART-CON-006', ('ART-CON-006','LOT-2024-066'), ('ENT-PRINC','B-02-01'),  50, 'BL-2024-066')

# Câbles
entree('ART-CAB-001', ('ART-CAB-001','LOT-2024-CAB-01'), ('ENT-PRINC','C-01-01'), 2000, 'BL-2024-CAB-01')
entree('ART-CAB-002', ('ART-CAB-002','LOT-2024-CAB-02'), ('ENT-PRINC','C-01-01'), 2000, 'BL-2024-CAB-02')
entree('ART-CAB-003', ('ART-CAB-003','LOT-2024-CAB-03'), ('ENT-PRINC','C-01-02'), 1500, 'BL-2024-CAB-03')
entree('ART-CAB-004', ('ART-CAB-004','LOT-2024-CAB-HT'), ('ENT-PRINC','C-02-01'), 800, 'BL-2024-CAB-HT', 'Câble HT orange — projet EV Renault')

# Terminaux
entree('ART-TRM-001', ('ART-TRM-001','LOT-2024-TRM-01'), ('ENT-PRINC','A-02-02'), 10000, 'BL-2024-TRM-01')
entree('ART-TRM-002', ('ART-TRM-002','LOT-2024-TRM-02'), ('ENT-PRINC','A-02-02'),  10000, 'BL-2024-TRM-02')
entree('ART-TRM-003', ('ART-TRM-003','LOT-2024-TRM-03'), ('ENT-PRINC','C-02-01'),  5000, 'BL-2024-TRM-03')

# Joints
entree('ART-SEE-001', ('ART-SEE-001','LOT-SEE-2024-A'), ('ENT-PRINC','A-01-01'), 5000, 'BL-2024-SEE-A')
entree('ART-SEE-002', ('ART-SEE-002','LOT-SEE-2024-B'), ('ENT-PRINC','A-01-01'), 5000, 'BL-2024-SEE-B')
entree('ART-SEE-003', ('ART-SEE-003','LOT-SEE-2024-C'), ('ENT-PRINC','A-01-02'), 8000, 'BL-2024-SEE-C', 'Attention : expiration proche')

# Sorties (consommation production)
sortie('ART-CON-001', ('ART-CON-001','LOT-2024-001'), ('ENT-PRINC','A-01-01'), 120, 'OF-2024-010', 'Projet Aptiv Alpha')
sortie('ART-CON-002', ('ART-CON-002','LOT-2024-010'), ('ENT-PRINC','A-02-01'),  80, 'OF-2024-010', 'Projet Aptiv Alpha')
sortie('ART-CON-003', ('ART-CON-003','LOT-2024-022'), ('ENT-PRINC','B-01-01'),  45, 'OF-2024-011', 'Projet Yazaki')
sortie('ART-CAB-001', ('ART-CAB-001','LOT-2024-CAB-01'), ('ENT-PRINC','C-01-01'), 350, 'OF-2024-010')
sortie('ART-CAB-002', ('ART-CAB-002','LOT-2024-CAB-02'), ('ENT-PRINC','C-01-01'), 350, 'OF-2024-010')
sortie('ART-TRM-001', ('ART-TRM-001','LOT-2024-TRM-01'), ('ENT-PRINC','A-02-02'), 2400, 'OF-2024-010')
sortie('ART-TRM-002', ('ART-TRM-002','LOT-2024-TRM-02'), ('ENT-PRINC','A-02-02'), 2400, 'OF-2024-010')
sortie('ART-SEE-001', ('ART-SEE-001','LOT-SEE-2024-A'), ('ENT-PRINC','A-01-01'), 1200, 'OF-2024-010')
sortie('ART-SEE-002', ('ART-SEE-002','LOT-SEE-2024-B'), ('ENT-PRINC','A-01-01'),  800, 'OF-2024-011')
sortie('ART-CON-005', ('ART-CON-005','LOT-2024-055'), ('ENT-PRINC','B-02-01'),   12, 'OF-2024-012', 'Projet Renault EV')
sortie('ART-CAB-004', ('ART-CAB-004','LOT-2024-CAB-HT'), ('ENT-PRINC','C-02-01'), 200, 'OF-2024-012')

# Transferts vers stock secondaire
transfert('ART-CON-001', ('ART-CON-001','LOT-2024-088'),
          ('ENT-PRINC','A-01-02'), ('ENT-SECON','S-01-01'), 100, 'TRF-2024-001')
transfert('ART-TRM-003', ('ART-TRM-003','LOT-2024-TRM-03'),
          ('ENT-PRINC','C-02-01'), ('ENT-SECON','S-02-01'), 1000, 'TRF-2024-002')
transfert('ART-SEE-003', ('ART-SEE-003','LOT-SEE-2024-C'),
          ('ENT-PRINC','A-01-02'), ('ENT-QUART','Q-01-01'), 500, 'TRF-QUART-001', )

print(f"  {Mouvement.objects.count()} mouvements  |  {Stock.objects.count()} lignes stock")

# ── 7. Tickets ────────────────────────────────────────────────────────────────
print("Tickets...")
tickets_data = [
    ('article',   'ART-CON-001', None, None,           'QR:ART-CON-001|Connecteur 12v 2.8mm', 'genere'),
    ('article',   'ART-CON-005', None, None,           'QR:ART-CON-005|Connecteur HT 800V',   'genere'),
    ('article',   'ART-CAB-004', None, None,           'QR:ART-CAB-004|Câble HT 2.5mm',       'imprime'),
    ('lot',       'ART-SEE-003', 'LOT-SEE-2024-C', None, 'QR:LOT-SEE-2024-C|EXP:' + str(today + timedelta(days=20)), 'genere'),
    ('lot',       'ART-SEE-001', 'LOT-SEE-2023-X', None, 'QR:LOT-SEE-2023-X|PERIME', 'annule'),
    ('placement', None, None, ('ENT-PRINC','B-02-01'), 'QR:ENT-PRINC/B-02-01|HT ZONE', 'imprime'),
    ('placement', None, None, ('ENT-QUART','Q-01-01'), 'QR:ENT-QUART/Q-01-01|QUARANTAINE', 'genere'),
]
for type_src, art_key, lot_key, pl_key, qr_contenu, statut in tickets_data:
    Ticket.objects.get_or_create(
        qr_contenu=qr_contenu,
        defaults={
            'type_source': type_src,
            'article':   arts.get(art_key) if art_key else None,
            'lot':       lots.get((art_key, lot_key)) if lot_key else None,
            'placement': placements.get(pl_key) if pl_key else None,
            'statut':    statut,
            'utilisateur': admin,
        },
    )
print(f"  {Ticket.objects.count()} tickets")

# ── Résumé ────────────────────────────────────────────────────────────────────
print()
print("=== Données de démonstration chargées ===")
print(f"  Catégories  : {Categorie.objects.count()}")
print(f"  Articles    : {Article.objects.count()}")
print(f"  Entrepôts   : {Entrepot.objects.count()}")
print(f"  Placements  : {Placement.objects.count()}")
print(f"  Lots        : {Lot.objects.count()}")
print(f"  Mouvements  : {Mouvement.objects.count()}")
print(f"  Stocks      : {Stock.objects.count()}")
print(f"  Tickets     : {Ticket.objects.count()}")
