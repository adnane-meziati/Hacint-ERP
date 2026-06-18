# Plan comptable PCGE (CGNC) — squelette des comptes essentiels + journaux.
from django.db import migrations

COMPTES = [
    # ── Classe 1 — Financement permanent ──────────────────────────────────────
    ('1111',  'Capital social'),
    ('1140',  'Réserve légale'),
    ('1161',  'Report à nouveau (solde créditeur)'),
    ('1191',  "Résultat net de l'exercice"),
    ('1481',  'Emprunts auprès des établissements de crédit'),
    # ── Classe 2 — Actif immobilisé ───────────────────────────────────────────
    ('2111',  'Frais de constitution'),
    ('2220',  'Brevets, marques, droits et valeurs similaires'),
    ('2321',  'Bâtiments'),
    ('2332',  'Matériel et outillage'),
    ('2340',  'Matériel de transport'),
    ('2351',  'Mobilier de bureau'),
    ('2355',  'Matériel informatique'),
    ('28332', 'Amortissements du matériel et outillage'),
    ('28355', 'Amortissements du matériel informatique'),
    # ── Classe 3 — Actif circulant ────────────────────────────────────────────
    ('3111',  'Marchandises'),
    ('3121',  'Matières premières'),
    ('3421',  'Clients'),
    ('3425',  'Clients — effets à recevoir'),
    ('34551', 'État — TVA récupérable sur immobilisations'),
    ('34552', 'État — TVA récupérable sur charges'),
    ('3456',  'État — crédit de TVA'),
    ('3458',  'État — autres comptes débiteurs (RAS subie)'),
    # ── Classe 4 — Passif circulant ───────────────────────────────────────────
    ('4411',  'Fournisseurs'),
    ('4415',  'Fournisseurs — effets à payer'),
    ('4432',  'Rémunérations dues au personnel'),
    ('4441',  'Caisse Nationale de Sécurité Sociale (CNSS)'),
    ('4452',  'État — impôts, taxes et assimilés'),
    ('4453',  'État — impôts sur les résultats (IS)'),
    ('4455',  'État — TVA facturée'),
    ('4456',  'État — TVA due suivant déclarations'),
    ('4458',  'État — autres comptes créditeurs (RAS, timbre)'),
    # ── Classe 5 — Trésorerie ─────────────────────────────────────────────────
    ('5111',  'Chèques en portefeuille'),
    ('5141',  'Banques (soldes débiteurs)'),
    ('5161',  'Caisse'),
    # ── Classe 6 — Charges ────────────────────────────────────────────────────
    ('6111',  'Achats de marchandises'),
    ('6121',  'Achats de matières premières'),
    ('6125',  'Achats non stockés de matières et fournitures'),
    ('6131',  'Locations et charges locatives'),
    ('6133',  'Entretien et réparations'),
    ('6136',  "Rémunérations d'intermédiaires et honoraires"),
    ('6144',  'Publicité, publications et relations publiques'),
    ('6145',  'Frais postaux et frais de télécommunications'),
    ('6167',  'Impôts, taxes et droits assimilés (timbre…)'),
    ('6171',  'Rémunérations du personnel'),
    ('6174',  'Charges sociales'),
    ('6311',  'Intérêts des emprunts et dettes'),
    ('6701',  'Impôts sur les bénéfices'),
    # ── Classe 7 — Produits ───────────────────────────────────────────────────
    ('7111',  'Ventes de marchandises au Maroc'),
    ('7121',  'Ventes de biens produits au Maroc'),
    ('7124',  'Ventes de services produits au Maroc'),
    ('7127',  'Ventes de produits accessoires'),
    ('7381',  'Intérêts et produits assimilés'),
]

JOURNAUX = [
    ('VT', 'Journal des ventes',       'vente'),
    ('AC', 'Journal des achats',       'achat'),
    ('BQ', 'Journal de banque',        'tresorerie'),
    ('CS', 'Journal de caisse',        'tresorerie'),
    ('OD', 'Opérations diverses',      'od'),
]


def seed(apps, schema_editor):
    CompteComptable = apps.get_model('accounting', 'CompteComptable')
    Journal = apps.get_model('accounting', 'Journal')
    for numero, intitule in COMPTES:
        CompteComptable.objects.get_or_create(
            numero=numero, defaults={'intitule': intitule})
    for code, libelle, type_journal in JOURNAUX:
        Journal.objects.get_or_create(
            code=code, defaults={'libelle': libelle, 'type_journal': type_journal})


def unseed(apps, schema_editor):
    CompteComptable = apps.get_model('accounting', 'CompteComptable')
    Journal = apps.get_model('accounting', 'Journal')
    CompteComptable.objects.filter(
        numero__in=[c[0] for c in COMPTES], lignes__isnull=True).delete()
    Journal.objects.filter(
        code__in=[j[0] for j in JOURNAUX], ecritures__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accounting', '0004_comptecomptable_journal_document_compte_contrepartie_and_more'),
    ]
    operations = [
        migrations.RunPython(seed, unseed),
    ]
