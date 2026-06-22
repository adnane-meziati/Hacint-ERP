#!/usr/bin/env python
"""
Seed script — creates a superuser and 10 example samples.
Run with: python seed.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from datetime import date, timedelta
from django.contrib.auth.models import Group, User
from samples.models import Sample

# ── Create permission groups ──────────────────────────────────────────────────
for group_name in ['Designer', 'Programmateur', 'CNC', 'Assembly', 'Quality',
                   'Storage', 'Etude Technique', 'Accounting']:
    _, created = Group.objects.get_or_create(name=group_name)
    print(f'Groupe {"créé" if created else "existant"}: {group_name}')

# ── Superuser ─────────────────────────────────────────────────────────────────
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser('admin', 'admin@hacint.local', 'admin123')
    print('Superuser créé: admin / admin123')
else:
    admin = User.objects.get(username='admin')
    print('Superuser existant.')

SEED_DATA = [
    dict(apn='APN-001-AA', project='Aptiv EMEA - Projet Alpha',  placement='A1',  client='Aptiv',      status='approved', quantity=5,  connector_fill='full',    description='Connecteur 12 voies, type 2.8mm'),
    dict(apn='APN-002-BB', project='Aptiv EMEA - Projet Alpha',  placement='B3',  client='Aptiv',      status='pending',  quantity=2,  connector_fill='empty',   description='Connecteur 6 voies, blindé'),
    dict(apn='YZK-100-X',  project='Yazaki Engine Harness',      placement='C5',  client='Yazaki',     status='approved', quantity=10, connector_fill='full',    description='Connecteur moteur haute température'),
    dict(apn='YZK-200-X',  project='Yazaki Engine Harness',      placement='A12', client='Yazaki',     status='rejected', quantity=1,  connector_fill='partial', description='Non conforme dimensions'),
    dict(apn='LEAR-055',   project='Lear Body Control',          placement='D2',  client='Lear',       status='pending',  quantity=3,  connector_fill='empty',   description='Connecteur tableau de bord'),
    dict(apn='RNT-3012',   project='Renault Megane E-Tech',      placement='B1',  client='Renault',    status='approved', quantity=8,  connector_fill='full',    description='Connecteur haute tension EV'),
    dict(apn='RNT-3013',   project='Renault Megane E-Tech',      placement='C1',  client='Renault',    status='pending',  quantity=4,  connector_fill='partial'),
    dict(apn='STL-777A',   project='Stellantis Compass',         placement='A3',  client='Stellantis', status='archived', quantity=1,  connector_fill='empty',   description='Archivé - fin de série'),
    dict(apn='SMT-88X',    project='Sumitomo Truck Series',      placement='B8',  client='Sumitomo',   status='pending',  quantity=6,  connector_fill='full',    description='Grande section 6.3mm'),
    dict(apn='OTH-999',    project='Projet Interne Test',        placement='C12', client='Other',      status='pending',  quantity=2,  connector_fill='partial', description='Prototype interne pour validation'),
]

today = date.today()
created = 0
for i, data in enumerate(SEED_DATA):
    received = today - timedelta(days=i * 3)
    _, made = Sample.objects.get_or_create(
        apn=data['apn'],
        project=data['project'],
        defaults={**data, 'received_date': received, 'created_by': admin},
    )
    if made:
        created += 1

print(f'{created} échantillon(s) créé(s) ({len(SEED_DATA) - created} déjà existant(s)).')

# ══════════════════════════════════════════════════════════════════════════════
# COMPTABILITÉ — tiers, devis, factures, avoirs, achats, paiements de démo
# ══════════════════════════════════════════════════════════════════════════════
from decimal import Decimal
from accounting.models import Document, DocumentLigne, Paiement, TaxCode, Tiers

# ── Utilisateur de démo pour la section Comptabilité ─────────────────────────
if not User.objects.filter(username='compta').exists():
    compta_user = User.objects.create_user(
        'compta', password='compta123', first_name='Fatima', last_name='Comptable')
    compta_user.groups.add(Group.objects.get(name='Accounting'))
    print('Utilisateur comptabilité créé: compta / compta123')

if Tiers.objects.filter(code='CLI-APTIV').exists():
    print('Données comptabilité déjà présentes — seed comptabilité ignoré.')
else:
    tva20 = TaxCode.objects.get(code='TVA20')
    tva10 = TaxCode.objects.get(code='TVA10')

    # ── Tiers ─────────────────────────────────────────────────────────────────
    TIERS = [
        dict(code='CLI-APTIV',  raison_sociale='Aptiv Maroc SA', est_client=True,
             ice='001528374000045', if_fiscal='40112233', rc='98451', tp='50114478',
             adresse='Tanger Free Zone, Lot 14B', ville='Tanger',
             delai_paiement_jours=60, contact='Karim Bensaid',
             telephone='+212 539 39 41 00', email='achats@aptiv-maroc.ma'),
        dict(code='CLI-YAZAKI', raison_sociale='Yazaki Morocco SA', est_client=True,
             ice='000947561000032', if_fiscal='40225566', rc='76210', tp='50229911',
             adresse='Zone Franche, Ilot 8', ville='Tanger',
             delai_paiement_jours=90, contact='Sara El Amrani',
             email='purchasing@yazaki-morocco.ma'),
        dict(code='CLI-LEAR',   raison_sociale='Lear Corporation Maroc', est_client=True,
             ice='002136985000071', if_fiscal='40338899', rc='112045', tp='50336644',
             adresse='Technopolis, Bât. C2', ville='Rabat',
             delai_paiement_jours=60),
        dict(code='CLI-RNT',    raison_sociale='Renault Tanger Exploitation', est_client=True,
             ice='001789456000018', if_fiscal='40441122', rc='65498', tp='50442277',
             adresse='Zone Industrielle Melloussa', ville='Tanger',
             delai_paiement_jours=30),
        dict(code='FRS-OUTIL',  raison_sociale='Outillage Précision Tanger SARL',
             est_client=False, est_fournisseur=True,
             ice='002475813000056', if_fiscal='41557788', rc='88122', tp='51668899',
             adresse='Zone Industrielle Gzenaya, Lot 112', ville='Tanger',
             delai_paiement_jours=30),
        dict(code='FRS-ACIER',  raison_sociale='Aciers du Détroit SARL',
             est_client=False, est_fournisseur=True,
             ice='001236547000089', if_fiscal='41669900', rc='54781', tp='51770022',
             adresse='Route de Tétouan, Km 9', ville='Tanger'),
        dict(code='FRS-CONSEIL', raison_sociale='Cabinet Comptable Atlas',
             est_client=False, est_fournisseur=True,
             ice='002965874000023', if_fiscal='41882244', rc='33652', tp='51993366',
             adresse='Av. Mohammed V, Imm. 24, 3e étage', ville='Tanger'),
    ]
    tiers_par_code = {}
    for data in TIERS:
        tiers_par_code[data['code']] = Tiers.objects.create(**data)
    print(f'{len(TIERS)} tiers créés (4 clients, 3 fournisseurs).')

    # ── Aides ─────────────────────────────────────────────────────────────────
    def doc(doc_type, code_tiers, date_emission, lignes, valider=True, **extra):
        document = Document.objects.create(
            doc_type=doc_type, tiers=tiers_par_code[code_tiers],
            date_emission=date_emission, created_by=admin, **extra)
        for index, (designation, qte, pu, tax) in enumerate(lignes):
            DocumentLigne.objects.create(
                document=document, ordre=index, designation=designation,
                quantite=Decimal(qte), prix_unitaire_ht=Decimal(pu), tax_code=tax)
        document.recompute_totals()
        if valider:
            document.valider(user=admin)
        return document

    def payer(document, montant, date_paiement, mode='virement', **extra):
        return Paiement.objects.create(
            document=document, montant=Decimal(montant),
            date_paiement=date_paiement, mode=mode, created_by=admin, **extra)

    annee = today.year

    # ── Devis ─────────────────────────────────────────────────────────────────
    devis_accepte = doc('devis', 'CLI-APTIV', date(annee, 2, 18), [
        ('Échantillon connecteur 12 voies — étude + réalisation', 5, '450.00', tva20),
        ('Plaque support placement A1', 1, '320.00', tva20),
    ], objet='Projet Alpha — phase échantillons')
    devis_accepte.statut = 'accepte'
    devis_accepte.save(update_fields=['statut'])

    doc('devis', 'CLI-LEAR', date(annee, 6, 3), [
        ('Échantillons connecteurs tableau de bord (lot de 3)', 3, '380.00', tva20),
    ], objet='Body Control — consultation')                      # envoyé

    doc('devis', 'CLI-RNT', date(annee, 6, 9), [
        ('Étude faisabilité connecteur HT 6.3mm', 1, '1500.00', tva20),
    ], valider=False, objet='Megane E-Tech — pré-étude')         # brouillon

    # ── Factures de vente ─────────────────────────────────────────────────────
    f1 = doc('facture', 'CLI-APTIV', date(annee, 1, 15), [
        ('Échantillons connecteurs 2.8mm (lot de 10)', 10, '290.00', tva20),
        ('Transport et emballage', 1, '400.00', tva10),
    ], objet='Projet Alpha — livraison janvier', reference_externe='BC-A-1101')
    payer(f1, '3920.00', date(annee, 2, 20))                      # payée intégralement

    f2 = doc('facture', 'CLI-YAZAKI', date(annee, 3, 10), [
        ('Échantillons connecteurs moteur haute température', 8, '510.00', tva20),
        ('Reprise rework placement C5', 2, '180.00', tva20),
    ], objet='Engine Harness — lot mars', reference_externe='PO-YZ-2230')
    payer(f2, '2500.00', date(annee, 4, 15), mode='cheque',
          reference='CHQ 0078812', banque='Attijariwafa Bank')   # partiellement payée

    f3 = doc('facture', 'CLI-APTIV', date(annee, 3, 25), [
        ('Facturation devis accepté — Projet Alpha', 5, '450.00', tva20),
        ('Plaque support placement A1', 1, '320.00', tva20),
    ], objet='Projet Alpha — phase échantillons',
        document_origine=devis_accepte)
    payer(f3, '3084.00', date(annee, 5, 22))                      # payée

    f_retard = doc('facture', 'CLI-RNT', date(annee, 4, 25), [
        ('Échantillons connecteurs haute tension EV', 4, '620.00', tva20),
    ], objet='Megane E-Tech — lot avril', reference_externe='CMD-RNT-5512')
    # échéance 30 j → 25/05 : en retard, aucun paiement

    doc('facture', 'CLI-LEAR', date(annee, 6, 2), [
        ('Échantillons connecteurs tableau de bord', 3, '380.00', tva20),
    ], objet='Body Control — livraison juin')                     # validée récente

    doc('facture', 'CLI-YAZAKI', date(annee, 6, 10), [
        ('Échantillons grande section 6.3mm', 6, '475.00', tva20),
    ], valider=False, objet='Truck Series — en préparation')      # brouillon

    # ── Avoir (remise commerciale sur f2) ─────────────────────────────────────
    doc('avoir', 'CLI-YAZAKI', date(annee, 4, 2), [
        ('Avoir — remise commerciale lot mars (2 pièces non conformes)',
         2, '510.00', tva20),
    ], objet='Avoir partiel sur ' + (f2.numero or ''), document_origine=f2)

    # ── Factures d'achat ──────────────────────────────────────────────────────
    fa1 = doc('facture_achat', 'FRS-OUTIL', date(annee, 1, 8), [
        ('3AIO-3.1-4.0-0.8 — Anvil Insulation', 4, '15.30', tva20),
        ('3C-1.6-2.5-10-0.5 — Anvil Punsh', 6, '20.40', tva20),
        ('YJM-E300-26 (Q-2.00-20.7) — MATRICE', 2, '15.90', tva20),
    ], reference_externe='F-2026-0112', objet='Outillage janvier')
    payer(fa1, '258.48', date(annee, 1, 28))                      # payée

    fa2 = doc('facture_achat', 'FRS-ACIER', date(annee, 3, 15), [
        ('Acier C45 rectifié — barres 40×40', 12, '85.00', tva20),
        ('Cuivre électrolytique — plaques 5mm', 4, '210.00', tva20),
    ], reference_externe='AC-889', objet='Matière première T1')
    payer(fa2, '1000.00', date(annee, 4, 10), mode='cheque',
          reference='CHQ 0045521', banque='BMCE Bank')            # partiellement payée

    fa3 = doc('facture_achat', 'FRS-OUTIL', date(annee, 5, 12), [
        ('YJM-S3315-01 — CUTTER', 3, '14.45', tva20),
        ('HAC-12.1-12.0-A — Anvil Punsh', 1, '30.55', tva20),
    ], reference_externe='F-2026-0455', objet='Outillage mai')
    payer(fa3, '88.68', date(annee, 5, 15), mode='espece')        # payée en espèces → timbre

    fa_ras = doc('facture_achat', 'FRS-CONSEIL', date(annee, 5, 30), [
        ('Honoraires — assistance clôture comptable T1', 1, '4000.00', tva20),
    ], reference_externe='HON-2026-77', objet='Honoraires comptables',
        ras_type='is_ht', ras_taux=Decimal('10'))
    payer(fa_ras, '4400.00', date(annee, 6, 8))                   # payée (net après RAS)

    doc('facture_achat', 'FRS-ACIER', date(annee, 6, 5), [
        ('Acier inox 304 — tôles 2mm', 6, '145.00', tva20),
    ], reference_externe='AC-1021', objet='Matière juin')          # validée non payée

    nb_docs = Document.objects.count()
    nb_paiements = Paiement.objects.count()
    print(f'Comptabilité : {nb_docs} documents et {nb_paiements} paiements créés.')

# ── Comptabilisation automatique de tout l'existant (journaux VT/AC/BQ/CS) ───
from accounting.comptabilite import comptabiliser_tout
resultat = comptabiliser_tout(user=admin)
if resultat['documents'] or resultat['paiements']:
    print(f"Écritures générées : {resultat['documents']} document(s), "
          f"{resultat['paiements']} paiement(s).")
