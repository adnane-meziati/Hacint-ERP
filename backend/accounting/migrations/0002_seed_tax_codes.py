# Codes TVA marocains (réforme LF 2024-2026 : seuls 20 % et 10 % subsistent
# depuis le 01/01/2026 ; 7 % et 14 % conservés inactifs pour l'historique).
from django.db import migrations

TAX_CODES = [
    # (code, libellé, taux, actif, mention légale)
    ('TVA20', 'TVA 20 % (taux normal)',        '20.00', True,  ''),
    ('TVA10', 'TVA 10 % (taux réduit)',        '10.00', True,  ''),
    ('TVA0',  'Exonéré de TVA (0 %)',          '0.00',  True,
     'Exonéré de TVA en vertu des articles 91/92 du CGI.'),
    ('TVAHC', 'Hors champ de TVA',             '0.00',  True,
     'Opération hors champ d’application de la TVA.'),
    ('TVA14', 'TVA 14 % (supprimé — historique)', '14.00', False, ''),
    ('TVA7',  'TVA 7 % (supprimé — historique)',  '7.00',  False, ''),
]


def seed(apps, schema_editor):
    TaxCode = apps.get_model('accounting', 'TaxCode')
    for code, libelle, taux, actif, mention in TAX_CODES:
        TaxCode.objects.get_or_create(
            code=code,
            defaults={'libelle': libelle, 'taux': taux, 'actif': actif,
                      'mention_legale': mention},
        )


def unseed(apps, schema_editor):
    TaxCode = apps.get_model('accounting', 'TaxCode')
    TaxCode.objects.filter(
        code__in=[c[0] for c in TAX_CODES], lignes__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accounting', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(seed, unseed),
    ]
