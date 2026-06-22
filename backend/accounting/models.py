import re
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone


# ─── Choices ──────────────────────────────────────────────────────────────────

DOC_TYPES = [
    ('devis',         'Devis'),
    ('facture',       'Facture'),
    ('avoir',         'Avoir'),
    ('facture_achat', "Facture d'achat"),
    ('avoir_achat',   "Avoir d'achat"),
]

# Préfixes de numérotation séquentielle (sans rupture — exigence art. 145 CGI)
DOC_PREFIXES = {
    'devis':         'DEV',
    'facture':       'FAC',
    'avoir':         'AVR',
    'facture_achat': 'FA',
    'avoir_achat':   'AVA',
}

# Types « vente » (émis vers un client) vs « achat » (reçus d'un fournisseur)
DOC_TYPES_VENTE = ('devis', 'facture', 'avoir')
DOC_TYPES_ACHAT = ('facture_achat', 'avoir_achat')
DOC_TYPES_FACTURE = ('facture', 'facture_achat')   # encaissables / décaissables
DOC_TYPES_AVOIR = ('avoir', 'avoir_achat')

STATUT_DOCUMENT = [
    ('brouillon',            'Brouillon'),
    ('validee',              'Validé'),
    ('envoye',               'Envoyé'),            # devis uniquement
    ('accepte',              'Accepté'),           # devis uniquement
    ('refuse',               'Refusé'),            # devis uniquement
    ('expire',               'Expiré'),            # devis uniquement
    ('partiellement_payee',  'Partiellement payé'),
    ('payee',                'Payé'),
    ('annulee',              'Annulé'),
]

MODE_PAIEMENT = [
    ('virement',     'Virement bancaire'),
    ('cheque',       'Chèque'),
    ('espece',       'Espèces'),
    ('effet',        'Effet de commerce'),
    ('carte',        'Carte bancaire'),
    ('compensation', 'Compensation'),
]

# Codes "mode de paiement" du relevé des déductions Simpl-TVA (DGI)
MODE_PAIEMENT_DGI = {
    'espece':       1,
    'cheque':       2,
    'virement':     4,
    'effet':        5,
    'compensation': 6,
    'carte':        7,
}

RAS_TYPES = [
    ('aucune', 'Aucune'),
    ('is_ht',  'RAS sur le HT (IS / honoraires)'),
    ('tva',    'RAS sur la TVA'),
]

TVA_REGIMES = [
    ('encaissement', 'Encaissement (droit commun)'),
    ('debit',        'Débits (sur option)'),
]

TVA_PERIODICITES = [
    ('mensuelle',     'Mensuelle (CA ≥ 1 MDH)'),
    ('trimestrielle', 'Trimestrielle'),
]

# Droit de timbre sur les règlements en espèces (art. 252 CGI) : 0,25 %
TIMBRE_TAUX_ESPECES = Decimal('0.0025')

ICE_RE = re.compile(r'^\d{15}$')

TWO_PLACES = Decimal('0.01')


def _round2(value):
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def validate_ice(value):
    if value and not ICE_RE.match(value):
        raise ValidationError("L'ICE doit comporter exactement 15 chiffres.")


# ─── Profil société (émetteur des documents — mentions art. 145 CGI) ──────────

class CompanyProfile(models.Model):
    """Singleton : identité légale de la société émettrice des factures."""
    raison_sociale  = models.CharField(max_length=200, blank=True)
    forme_juridique = models.CharField(max_length=50, blank=True,
                                       help_text='SARL, SA, SAS, auto-entrepreneur…')
    capital_social  = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    adresse         = models.TextField(blank=True)
    ville           = models.CharField(max_length=100, blank=True)
    telephone       = models.CharField(max_length=50, blank=True)
    email           = models.EmailField(blank=True)
    site_web        = models.CharField(max_length=100, blank=True)
    # Identifiants légaux marocains
    ice  = models.CharField('ICE', max_length=15, blank=True, validators=[validate_ice])
    if_fiscal = models.CharField('Identifiant fiscal (IF)', max_length=20, blank=True)
    rc   = models.CharField('Registre du commerce (RC)', max_length=20, blank=True)
    tp   = models.CharField('Taxe professionnelle (TP)', max_length=20, blank=True)
    cnss = models.CharField('CNSS', max_length=20, blank=True)
    # Coordonnées bancaires (affichées sur les factures)
    banque = models.CharField(max_length=100, blank=True)
    rib    = models.CharField('RIB', max_length=24, blank=True)
    # Paramètres TVA
    tva_regime      = models.CharField(max_length=15, choices=TVA_REGIMES, default='encaissement')
    tva_periodicite = models.CharField(max_length=15, choices=TVA_PERIODICITES, default='trimestrielle')
    logo = models.ImageField(upload_to='accounting/', null=True, blank=True)
    pied_de_page = models.TextField(blank=True, help_text='Texte libre ajouté en bas des PDF.')

    class Meta:
        verbose_name = 'Profil société'

    def __str__(self):
        return self.raison_sociale or 'Profil société'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# ─── Tiers (clients & fournisseurs) ───────────────────────────────────────────

class Tiers(models.Model):
    code            = models.CharField(max_length=20, unique=True, db_index=True)
    raison_sociale  = models.CharField(max_length=200)
    est_client      = models.BooleanField(default=True)
    est_fournisseur = models.BooleanField(default=False)
    # Un particulier n'a pas d'ICE — l'ICE est exigé pour les ventes B2B
    est_particulier = models.BooleanField(default=False)
    ice  = models.CharField('ICE', max_length=15, blank=True, validators=[validate_ice])
    if_fiscal = models.CharField('Identifiant fiscal (IF)', max_length=20, blank=True)
    rc   = models.CharField('RC', max_length=20, blank=True)
    tp   = models.CharField('TP', max_length=20, blank=True)
    adresse   = models.TextField(blank=True)
    ville     = models.CharField(max_length=100, blank=True)
    pays      = models.CharField(max_length=100, default='Maroc')
    contact   = models.CharField(max_length=200, blank=True)
    telephone = models.CharField(max_length=50, blank=True)
    email     = models.EmailField(blank=True)
    delai_paiement_jours = models.PositiveIntegerField(
        default=0, help_text='0 = comptant ; 30/60/90 = échéance en jours.')
    actif = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        verbose_name = 'Tiers'
        verbose_name_plural = 'Tiers'

    def __str__(self):
        return f"{self.code} — {self.raison_sociale}"


# ─── Codes TVA ────────────────────────────────────────────────────────────────

class TaxCode(models.Model):
    code    = models.CharField(max_length=10, unique=True)
    libelle = models.CharField(max_length=100)
    taux    = models.DecimalField(max_digits=5, decimal_places=2)
    actif   = models.BooleanField(default=True)
    mention_legale = models.CharField(
        max_length=255, blank=True,
        help_text="Mention portée sur la facture (ex : « Exonéré de TVA — art. 92 du CGI »).")

    class Meta:
        ordering = ['-taux']
        verbose_name = 'Code TVA'
        verbose_name_plural = 'Codes TVA'

    def __str__(self):
        return f"{self.libelle}"


# ─── Numérotation séquentielle sans rupture ───────────────────────────────────

class DocumentSequence(models.Model):
    """Compteur par type de document et par année.

    Le numéro n'est attribué qu'à la validation (jamais en brouillon) et n'est
    jamais réutilisé — exigence de numérotation continue de l'art. 145 du CGI.
    """
    doc_type       = models.CharField(max_length=20, choices=DOC_TYPES)
    annee          = models.PositiveIntegerField()
    dernier_numero = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [('doc_type', 'annee')]
        verbose_name = 'Séquence de numérotation'

    def __str__(self):
        return f"{self.doc_type} {self.annee} → {self.dernier_numero}"

    @classmethod
    def next_numero(cls, doc_type, annee):
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(
                doc_type=doc_type, annee=annee)
            seq.dernier_numero += 1
            seq.save(update_fields=['dernier_numero'])
            return f"{DOC_PREFIXES[doc_type]}-{annee}-{seq.dernier_numero:05d}"


# ─── Documents (devis / factures / avoirs, vente & achat) ─────────────────────

class Document(models.Model):
    doc_type = models.CharField(max_length=20, choices=DOC_TYPES, db_index=True)
    numero   = models.CharField(max_length=20, unique=True, null=True, blank=True,
                                help_text='Attribué automatiquement à la validation.')
    statut   = models.CharField(max_length=25, choices=STATUT_DOCUMENT,
                                default='brouillon', db_index=True)
    tiers    = models.ForeignKey(Tiers, on_delete=models.PROTECT, related_name='documents')
    date_emission = models.DateField(default=timezone.localdate)
    date_echeance = models.DateField(null=True, blank=True)
    # Achats : numéro de la facture du fournisseur — Ventes : réf. commande client
    reference_externe = models.CharField(max_length=50, blank=True)
    objet = models.CharField(max_length=255, blank=True)
    # Liens devis → facture et facture → avoir
    document_origine = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_derives')
    # Compte PCGE de contrepartie (classe 7 ventes / classe 6 achats) — si vide,
    # la comptabilisation utilise le compte par défaut (7121 / 6121)
    compte_contrepartie = models.ForeignKey(
        'CompteComptable', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents')
    # Retenue à la source
    ras_type = models.CharField(max_length=10, choices=RAS_TYPES, default='aucune')
    ras_taux = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # Totaux (recalculés depuis les lignes)
    total_ht    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_tva   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_ttc   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    ras_montant = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_a_payer = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    montant_paye = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_valides')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_crees')

    class Meta:
        ordering = ['-date_emission', '-id']
        verbose_name = 'Document'

    def __str__(self):
        return f"{self.numero or f'[brouillon {self.get_doc_type_display()}]'} — {self.tiers.raison_sociale}"

    # ── Propriétés ────────────────────────────────────────────────────────────

    @property
    def est_brouillon(self):
        return self.statut == 'brouillon'

    @property
    def est_vente(self):
        return self.doc_type in DOC_TYPES_VENTE

    @property
    def est_en_retard(self):
        return (
            self.doc_type in DOC_TYPES_FACTURE
            and self.statut in ('validee', 'partiellement_payee')
            and self.date_echeance is not None
            and self.date_echeance < timezone.localdate()
        )

    @property
    def reste_a_payer(self):
        return _round2(self.net_a_payer - self.montant_paye)

    # ── Calculs ───────────────────────────────────────────────────────────────

    def tva_par_taux(self):
        """{taux: {'base': HT, 'tva': TVA}} agrégé depuis les lignes."""
        detail = {}
        for ligne in self.lignes.all():
            taux = ligne.tax_code.taux
            entry = detail.setdefault(taux, {'base': Decimal('0'), 'tva': Decimal('0')})
            entry['base'] += ligne.montant_ht
            entry['tva']  += ligne.montant_tva
        return detail

    def recompute_totals(self, save=True):
        aggregat = self.lignes.aggregate(
            ht=models.Sum('montant_ht'), tva=models.Sum('montant_tva'),
            ttc=models.Sum('montant_ttc'))
        self.total_ht  = aggregat['ht'] or Decimal('0')
        self.total_tva = aggregat['tva'] or Decimal('0')
        self.total_ttc = aggregat['ttc'] or Decimal('0')
        if self.ras_type == 'is_ht':
            base = self.total_ht
        elif self.ras_type == 'tva':
            base = self.total_tva
        else:
            base = Decimal('0')
        self.ras_montant = _round2(base * self.ras_taux / Decimal('100'))
        self.net_a_payer = _round2(self.total_ttc - self.ras_montant)
        if save:
            self.save(update_fields=[
                'total_ht', 'total_tva', 'total_ttc',
                'ras_montant', 'net_a_payer', 'updated_at'])

    def refresh_statut_paiement(self, save=True):
        """Met à jour montant_paye + statut depuis les paiements enregistrés."""
        if self.doc_type not in DOC_TYPES_FACTURE:
            return
        total = self.paiements.aggregate(t=models.Sum('montant'))['t'] or Decimal('0')
        self.montant_paye = total
        if self.statut in ('validee', 'partiellement_payee', 'payee'):
            if total <= 0:
                self.statut = 'validee'
            elif total < self.net_a_payer:
                self.statut = 'partiellement_payee'
            else:
                self.statut = 'payee'
        if save:
            self.save(update_fields=['montant_paye', 'statut', 'updated_at'])

    # ── Cycle de vie ──────────────────────────────────────────────────────────

    def valider(self, user=None):
        """Attribue le numéro séquentiel et fige le document."""
        if self.statut != 'brouillon':
            raise ValidationError('Seul un brouillon peut être validé.')
        ExerciceComptable.verifier_ouvert(self.date_emission)
        if not self.lignes.exists():
            raise ValidationError('Impossible de valider un document sans ligne.')
        if self.est_vente and self.doc_type != 'devis' \
                and not self.tiers.est_particulier and not self.tiers.ice:
            raise ValidationError(
                "L'ICE du client est obligatoire pour les factures B2B "
                "(art. 145 du CGI). Renseignez l'ICE du tiers ou marquez-le « particulier ».")
        if self.doc_type == 'facture_achat' and not self.reference_externe:
            raise ValidationError(
                "Le numéro de la facture du fournisseur (référence externe) est obligatoire.")
        self.recompute_totals(save=False)
        annee = self.date_emission.year
        self.numero = DocumentSequence.next_numero(self.doc_type, annee)
        self.statut = 'envoye' if self.doc_type == 'devis' else 'validee'
        if self.doc_type in DOC_TYPES_FACTURE and self.date_echeance is None:
            self.date_echeance = self.date_emission + timedelta(
                days=self.tiers.delai_paiement_jours)
        self.validated_at = timezone.now()
        self.validated_by = user
        self.save()


class DocumentLigne(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='lignes')
    ordre    = models.PositiveIntegerField(default=0)
    article  = models.ForeignKey(
        'storage.Article', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lignes_document')
    designation      = models.CharField(max_length=255)
    quantite         = models.DecimalField(
        max_digits=12, decimal_places=3, default=1,
        validators=[MinValueValidator(Decimal('0.001'))])
    prix_unitaire_ht = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    remise_pct       = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_code         = models.ForeignKey(TaxCode, on_delete=models.PROTECT,
                                         related_name='lignes')
    montant_ht  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    montant_tva = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    montant_ttc = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['ordre', 'id']
        verbose_name = 'Ligne de document'

    def __str__(self):
        return f"{self.document} / {self.designation[:40]}"

    def save(self, *args, **kwargs):
        self.montant_ht = _round2(
            self.quantite * self.prix_unitaire_ht
            * (Decimal('1') - self.remise_pct / Decimal('100')))
        self.montant_tva = _round2(self.montant_ht * self.tax_code.taux / Decimal('100'))
        self.montant_ttc = _round2(self.montant_ht + self.montant_tva)
        super().save(*args, **kwargs)


# ─── Paiements (encaissements & décaissements) ────────────────────────────────

class Paiement(models.Model):
    document = models.ForeignKey(Document, on_delete=models.PROTECT, related_name='paiements')
    date_paiement = models.DateField(default=timezone.localdate)
    montant  = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))])
    mode      = models.CharField(max_length=15, choices=MODE_PAIEMENT, default='virement')
    reference = models.CharField(max_length=64, blank=True,
                                 help_text='N° de chèque, référence de virement…')
    banque    = models.CharField(max_length=100, blank=True)
    # Droit de timbre 0,25 % sur les règlements en espèces (art. 252 CGI)
    timbre_montant = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='paiements_crees')

    class Meta:
        ordering = ['-date_paiement', '-id']
        verbose_name = 'Paiement'

    def __str__(self):
        return f"{self.montant} MAD — {self.get_mode_display()} — {self.document}"

    def save(self, *args, **kwargs):
        if self.pk is None:
            ExerciceComptable.verifier_ouvert(self.date_paiement)
        if self.mode == 'espece' and not self.timbre_montant:
            self.timbre_montant = _round2(self.montant * TIMBRE_TAUX_ESPECES)
        super().save(*args, **kwargs)
        self.document.refresh_statut_paiement()

    def delete(self, *args, **kwargs):
        ExerciceComptable.verifier_ouvert(self.date_paiement)
        document = self.document
        super().delete(*args, **kwargs)
        document.refresh_statut_paiement()


# ═══════════════════════════════════════════════════════════════════════════════
# COMPTABILITÉ GÉNÉRALE — plan comptable PCGE, journaux, écritures (CGNC)
# ═══════════════════════════════════════════════════════════════════════════════

CLASSES_PCGE = {
    '1': 'Financement permanent',
    '2': 'Actif immobilisé',
    '3': 'Actif circulant',
    '4': 'Passif circulant',
    '5': 'Trésorerie',
    '6': 'Charges',
    '7': 'Produits',
    '8': 'Comptes de résultats',
}

TYPE_JOURNAL = [
    ('vente',      'Ventes'),
    ('achat',      'Achats'),
    ('tresorerie', 'Trésorerie'),
    ('od',         'Opérations diverses'),
]

STATUT_EXERCICE = [
    ('ouvert',  'Ouvert'),
    ('cloture', 'Clôturé'),
]


def validate_numero_compte(value):
    if not value.isdigit() or value[0] not in CLASSES_PCGE:
        raise ValidationError(
            'Le numéro de compte doit être numérique et commencer par '
            'une classe PCGE valide (1 à 8).')


class CompteComptable(models.Model):
    """Compte du Plan Comptable Général des Entreprises (CGNC)."""
    numero   = models.CharField(max_length=10, unique=True, db_index=True,
                                validators=[validate_numero_compte])
    intitule = models.CharField(max_length=200)
    actif    = models.BooleanField(default=True)

    class Meta:
        ordering = ['numero']
        verbose_name = 'Compte comptable'

    def __str__(self):
        return f'{self.numero} — {self.intitule}'

    @property
    def classe(self):
        return self.numero[0]


class Journal(models.Model):
    code         = models.CharField(max_length=5, unique=True)
    libelle      = models.CharField(max_length=100)
    type_journal = models.CharField(max_length=15, choices=TYPE_JOURNAL, default='od')

    class Meta:
        ordering = ['code']
        verbose_name = 'Journal'
        verbose_name_plural = 'Journaux'

    def __str__(self):
        return f'{self.code} — {self.libelle}'


class JournalSequence(models.Model):
    """Numérotation continue des écritures par journal et par année."""
    journal        = models.ForeignKey(Journal, on_delete=models.CASCADE,
                                       related_name='sequences')
    annee          = models.PositiveIntegerField()
    dernier_numero = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [('journal', 'annee')]

    @classmethod
    def next_numero(cls, journal, annee):
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(
                journal=journal, annee=annee)
            seq.dernier_numero += 1
            seq.save(update_fields=['dernier_numero'])
            return f'{journal.code}-{annee}-{seq.dernier_numero:05d}'


class ExerciceComptable(models.Model):
    """Exercice annuel — une fois clôturé, plus aucune opération datée
    dans l'exercice ne peut être créée, validée ou supprimée."""
    annee      = models.PositiveIntegerField(unique=True)
    statut     = models.CharField(max_length=10, choices=STATUT_EXERCICE,
                                  default='ouvert')
    cloture_at = models.DateTimeField(null=True, blank=True)
    cloture_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='exercices_clotures')

    class Meta:
        ordering = ['-annee']
        verbose_name = 'Exercice comptable'

    def __str__(self):
        return f'Exercice {self.annee} ({self.get_statut_display()})'

    @classmethod
    def est_cloture(cls, annee):
        return cls.objects.filter(annee=annee, statut='cloture').exists()

    @classmethod
    def verifier_ouvert(cls, date_operation):
        if cls.est_cloture(date_operation.year):
            raise ValidationError(
                f"L'exercice {date_operation.year} est clôturé — "
                "aucune opération ne peut y être enregistrée ou supprimée.")


class EcritureComptable(models.Model):
    journal       = models.ForeignKey(Journal, on_delete=models.PROTECT,
                                      related_name='ecritures')
    numero        = models.CharField(max_length=20, unique=True)
    date_ecriture = models.DateField(db_index=True)
    libelle       = models.CharField(max_length=255)
    # Source de l'écriture (générée) — null pour les OD saisies à la main
    document = models.OneToOneField(
        Document, on_delete=models.PROTECT, null=True, blank=True,
        related_name='ecriture')
    paiement = models.OneToOneField(
        Paiement, on_delete=models.CASCADE, null=True, blank=True,
        related_name='ecriture')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ecritures_creees')

    class Meta:
        ordering = ['-date_ecriture', '-id']
        verbose_name = 'Écriture comptable'

    def __str__(self):
        return f'{self.numero} — {self.libelle[:40]}'

    @property
    def est_generee(self):
        return self.document_id is not None or self.paiement_id is not None

    def total_debit(self):
        return self.lignes.aggregate(t=models.Sum('debit'))['t'] or Decimal('0')

    def total_credit(self):
        return self.lignes.aggregate(t=models.Sum('credit'))['t'] or Decimal('0')


class LigneEcriture(models.Model):
    ecriture = models.ForeignKey(EcritureComptable, on_delete=models.CASCADE,
                                 related_name='lignes')
    ordre    = models.PositiveIntegerField(default=0)
    compte   = models.ForeignKey(CompteComptable, on_delete=models.PROTECT,
                                 related_name='lignes')
    libelle  = models.CharField(max_length=255, blank=True)
    debit    = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                                   validators=[MinValueValidator(Decimal('0'))])
    credit   = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                                   validators=[MinValueValidator(Decimal('0'))])
    tiers    = models.ForeignKey(Tiers, on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name='lignes_ecriture')

    class Meta:
        ordering = ['ecriture', 'ordre', 'id']
        verbose_name = "Ligne d'écriture"

    def __str__(self):
        return f'{self.compte.numero} D:{self.debit} C:{self.credit}'


# ═══════════════════════════════════════════════════════════════════════════════
# DURÉE DE VIE DES ACTIFS — machines, PC, outils
# ═══════════════════════════════════════════════════════════════════════════════

ASSET_TYPES = [
    ('machine', 'Machine'),
    ('pc',      'PC'),
    ('tool',    'Outil'),
]


class Asset(models.Model):
    """Actif immobilisé suivi par amortissement linéaire (valeur / durée)."""
    name             = models.CharField(max_length=100)
    valeur_initiale  = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name='Valeur initiale (MAD)')
    duree_annees     = models.PositiveIntegerField(
        default=1, verbose_name='Durée de vie (années)')
    date_debut       = models.DateField(
        null=True, blank=True, verbose_name='Date de mise en service')
    # Champs conservés pour compatibilité avec les anciens enregistrements
    asset_type  = models.CharField(max_length=10, choices=ASSET_TYPES, default='machine')
    department  = models.ForeignKey(
        'hr.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assets')
    max_hours   = models.PositiveIntegerField(
        verbose_name='Durée de vie maximale (heures)',
        validators=[MinValueValidator(1)], null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['department__name', 'name']
        verbose_name = 'Actif'
        verbose_name_plural = 'Actifs'

    def __str__(self):
        return f'{self.name} ({self.get_asset_type_display()})'

    @classmethod
    def production_minutes_by_user(cls):
        """{user_id: minutes} — somme des compteurs de temps de samples.Sample
        (une phase = designer/programmeur/CNC/assemblage/qualité), groupés par
        l'utilisateur qui a réalisé chaque phase."""
        from samples.models import Sample

        champs = [
            ('done_by_id',            'time_spent_minutes'),
            ('programmer_done_by_id', 'programmer_time_spent_minutes'),
            ('cnc_done_by_id',        'cnc_time_spent_minutes'),
            ('assembly_done_by_id',   'assembly_time_spent_minutes'),
            ('quality_done_by_id',    'quality_time_spent_minutes'),
        ]
        totaux = {}
        for champ_user, champ_minutes in champs:
            lignes = (
                Sample.objects
                .exclude(**{champ_user: None})
                .values(champ_user)
                .annotate(total=models.Sum(champ_minutes))
            )
            for ligne in lignes:
                uid = ligne[champ_user]
                totaux[uid] = totaux.get(uid, 0) + (ligne['total'] or 0)
        return totaux


class UserAsset(models.Model):
    """Affectation d'un utilisateur à un actif : ses heures de production
    comptent alors dans la consommation totale de cet actif."""
    user  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name='asset_assignments')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE,
                              related_name='utilisateurs')

    class Meta:
        unique_together = [('user', 'asset')]
        verbose_name = 'Affectation utilisateur ↔ actif'
        verbose_name_plural = 'Affectations utilisateur ↔ actif'

    def __str__(self):
        return f'{self.user} ↔ {self.asset}'
