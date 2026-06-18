from decimal import Decimal

from rest_framework import serializers

from .models import (
    Asset, CompanyProfile, CompteComptable, Document, DocumentLigne,
    EcritureComptable, ExerciceComptable, Journal, LigneEcriture,
    Paiement, TaxCode, Tiers,
)


class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CompanyProfile
        fields = [
            'id', 'raison_sociale', 'forme_juridique', 'capital_social',
            'adresse', 'ville', 'telephone', 'email', 'site_web',
            'ice', 'if_fiscal', 'rc', 'tp', 'cnss',
            'banque', 'rib', 'tva_regime', 'tva_periodicite',
            'logo', 'pied_de_page',
        ]


class TiersSerializer(serializers.ModelSerializer):
    nbDocuments = serializers.SerializerMethodField()

    class Meta:
        model  = Tiers
        fields = [
            'id', 'code', 'raison_sociale',
            'est_client', 'est_fournisseur', 'est_particulier',
            'ice', 'if_fiscal', 'rc', 'tp',
            'adresse', 'ville', 'pays', 'contact', 'telephone', 'email',
            'delai_paiement_jours', 'actif', 'notes', 'nbDocuments',
        ]

    def get_nbDocuments(self, obj):
        return obj.documents.count()

    def validate(self, attrs):
        est_client = attrs.get('est_client', getattr(self.instance, 'est_client', True))
        est_fournisseur = attrs.get(
            'est_fournisseur', getattr(self.instance, 'est_fournisseur', False))
        if not est_client and not est_fournisseur:
            raise serializers.ValidationError(
                'Un tiers doit être client, fournisseur, ou les deux.')
        return attrs


class TaxCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TaxCode
        fields = ['id', 'code', 'libelle', 'taux', 'actif', 'mention_legale']


class DocumentLigneSerializer(serializers.ModelSerializer):
    articleCode = serializers.SerializerMethodField()
    tauxTva     = serializers.SerializerMethodField()

    class Meta:
        model  = DocumentLigne
        fields = [
            'id', 'ordre', 'article', 'articleCode', 'designation',
            'quantite', 'prix_unitaire_ht', 'remise_pct',
            'tax_code', 'tauxTva',
            'montant_ht', 'montant_tva', 'montant_ttc',
        ]
        read_only_fields = ['montant_ht', 'montant_tva', 'montant_ttc']

    def get_articleCode(self, obj):
        return obj.article.code_article if obj.article else None

    def get_tauxTva(self, obj):
        return obj.tax_code.taux


class PaiementSerializer(serializers.ModelSerializer):
    documentNumero = serializers.SerializerMethodField()
    documentType   = serializers.SerializerMethodField()
    tiersNom       = serializers.SerializerMethodField()
    modeDisplay    = serializers.CharField(source='get_mode_display', read_only=True)

    class Meta:
        model  = Paiement
        fields = [
            'id', 'document', 'documentNumero', 'documentType', 'tiersNom',
            'date_paiement', 'montant', 'mode', 'modeDisplay',
            'reference', 'banque', 'timbre_montant', 'notes', 'created_at',
        ]
        read_only_fields = ['timbre_montant']

    def get_documentNumero(self, obj):
        return obj.document.numero

    def get_documentType(self, obj):
        return obj.document.doc_type

    def get_tiersNom(self, obj):
        return obj.document.tiers.raison_sociale

    def validate(self, attrs):
        document = attrs.get('document') or getattr(self.instance, 'document', None)
        montant  = attrs.get('montant') or getattr(self.instance, 'montant', None)
        if document is not None:
            if document.doc_type not in ('facture', 'facture_achat'):
                raise serializers.ValidationError(
                    'Un paiement ne peut être enregistré que sur une facture.')
            if document.statut == 'brouillon':
                raise serializers.ValidationError(
                    'La facture doit être validée avant d’enregistrer un paiement.')
            if document.statut == 'annulee':
                raise serializers.ValidationError('Cette facture est annulée.')
            if montant is not None:
                deja = document.montant_paye
                if self.instance is not None:
                    deja -= self.instance.montant
                if deja + montant > document.net_a_payer:
                    raise serializers.ValidationError(
                        f'Le paiement dépasse le reste à payer '
                        f'({document.net_a_payer - deja} MAD).')
        return attrs


class DocumentSerializer(serializers.ModelSerializer):
    lignes      = DocumentLigneSerializer(many=True)
    tiersNom    = serializers.SerializerMethodField()
    tiersIce    = serializers.SerializerMethodField()
    typeDisplay   = serializers.CharField(source='get_doc_type_display', read_only=True)
    statutDisplay = serializers.CharField(source='get_statut_display', read_only=True)
    estEnRetard   = serializers.SerializerMethodField()
    resteAPayer   = serializers.SerializerMethodField()
    origineNumero = serializers.SerializerMethodField()

    class Meta:
        model  = Document
        fields = [
            'id', 'doc_type', 'typeDisplay', 'numero', 'statut', 'statutDisplay',
            'tiers', 'tiersNom', 'tiersIce',
            'date_emission', 'date_echeance', 'reference_externe', 'objet',
            'document_origine', 'origineNumero',
            'compte_contrepartie', 'compteContrepartieNumero',
            'ras_type', 'ras_taux', 'ras_montant',
            'total_ht', 'total_tva', 'total_ttc', 'net_a_payer',
            'montant_paye', 'resteAPayer', 'estEnRetard',
            'notes', 'validated_at', 'created_at', 'lignes',
        ]
        read_only_fields = [
            'numero', 'statut', 'total_ht', 'total_tva', 'total_ttc',
            'ras_montant', 'net_a_payer', 'montant_paye', 'validated_at',
            'document_origine',
        ]

    compteContrepartieNumero = serializers.SerializerMethodField()

    def get_tiersNom(self, obj):
        return obj.tiers.raison_sociale

    def get_tiersIce(self, obj):
        return obj.tiers.ice

    def get_compteContrepartieNumero(self, obj):
        return obj.compte_contrepartie.numero if obj.compte_contrepartie else None

    def get_estEnRetard(self, obj):
        return obj.est_en_retard

    def get_resteAPayer(self, obj):
        return obj.reste_a_payer

    def get_origineNumero(self, obj):
        return obj.document_origine.numero if obj.document_origine else None

    def validate(self, attrs):
        doc_type = attrs.get('doc_type') or getattr(self.instance, 'doc_type', None)
        tiers    = attrs.get('tiers') or getattr(self.instance, 'tiers', None)
        if doc_type and tiers:
            if doc_type in ('devis', 'facture', 'avoir') and not tiers.est_client:
                raise serializers.ValidationError(
                    {'tiers': "Ce tiers n'est pas un client."})
            if doc_type in ('facture_achat', 'avoir_achat') and not tiers.est_fournisseur:
                raise serializers.ValidationError(
                    {'tiers': "Ce tiers n'est pas un fournisseur."})
        lignes = attrs.get('lignes')
        if lignes is not None and len(lignes) == 0:
            raise serializers.ValidationError(
                {'lignes': 'Au moins une ligne est requise.'})
        return attrs

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', [])
        document = Document.objects.create(**validated_data)
        self._write_lignes(document, lignes_data)
        document.recompute_totals()
        return document

    def update(self, instance, validated_data):
        if not instance.est_brouillon:
            raise serializers.ValidationError(
                'Un document validé est immuable — créez un avoir pour le corriger.')
        lignes_data = validated_data.pop('lignes', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if lignes_data is not None:
            instance.lignes.all().delete()
            self._write_lignes(instance, lignes_data)
        instance.recompute_totals()
        return instance

    @staticmethod
    def _write_lignes(document, lignes_data):
        for index, ligne in enumerate(lignes_data):
            ligne.pop('document', None)
            ligne.setdefault('ordre', index)
            DocumentLigne.objects.create(document=document, **ligne)


# ─── Comptabilité générale ────────────────────────────────────────────────────

class CompteComptableSerializer(serializers.ModelSerializer):
    classe = serializers.CharField(read_only=True)
    nbLignes = serializers.SerializerMethodField()

    class Meta:
        model  = CompteComptable
        fields = ['id', 'numero', 'intitule', 'classe', 'actif', 'nbLignes']

    def get_nbLignes(self, obj):
        return obj.lignes.count()


class JournalSerializer(serializers.ModelSerializer):
    typeDisplay = serializers.CharField(source='get_type_journal_display', read_only=True)

    class Meta:
        model  = Journal
        fields = ['id', 'code', 'libelle', 'type_journal', 'typeDisplay']


class LigneEcritureSerializer(serializers.ModelSerializer):
    compteNumero   = serializers.SerializerMethodField()
    compteIntitule = serializers.SerializerMethodField()
    tiersNom       = serializers.SerializerMethodField()

    class Meta:
        model  = LigneEcriture
        fields = ['id', 'ordre', 'compte', 'compteNumero', 'compteIntitule',
                  'libelle', 'debit', 'credit', 'tiers', 'tiersNom']

    def get_compteNumero(self, obj):
        return obj.compte.numero

    def get_compteIntitule(self, obj):
        return obj.compte.intitule

    def get_tiersNom(self, obj):
        return obj.tiers.raison_sociale if obj.tiers else None


class EcritureComptableSerializer(serializers.ModelSerializer):
    lignes        = LigneEcritureSerializer(many=True)
    journalCode   = serializers.SerializerMethodField()
    totalDebit    = serializers.SerializerMethodField()
    totalCredit   = serializers.SerializerMethodField()
    sourceNumero  = serializers.SerializerMethodField()
    estGeneree    = serializers.SerializerMethodField()

    class Meta:
        model  = EcritureComptable
        fields = ['id', 'journal', 'journalCode', 'numero', 'date_ecriture',
                  'libelle', 'document', 'paiement', 'sourceNumero',
                  'estGeneree', 'totalDebit', 'totalCredit',
                  'created_at', 'lignes']
        read_only_fields = ['numero', 'document', 'paiement']

    def get_journalCode(self, obj):
        return obj.journal.code

    def get_totalDebit(self, obj):
        return float(obj.total_debit())

    def get_totalCredit(self, obj):
        return float(obj.total_credit())

    def get_sourceNumero(self, obj):
        if obj.document_id:
            return obj.document.numero
        if obj.paiement_id:
            return f'Paiement {obj.paiement.document.numero}'
        return None

    def get_estGeneree(self, obj):
        return obj.est_generee

    def validate(self, attrs):
        lignes = attrs.get('lignes') or []
        if self.instance is None:
            if len(lignes) < 2:
                raise serializers.ValidationError(
                    {'lignes': 'Une écriture doit comporter au moins deux lignes.'})
            total_debit  = sum((l.get('debit') or Decimal('0')) for l in lignes)
            total_credit = sum((l.get('credit') or Decimal('0')) for l in lignes)
            if total_debit != total_credit:
                raise serializers.ValidationError(
                    {'lignes': f'Écriture déséquilibrée : débit {total_debit} '
                               f'≠ crédit {total_credit}.'})
            if total_debit == 0:
                raise serializers.ValidationError(
                    {'lignes': 'Le montant de l\'écriture ne peut pas être nul.'})
            for ligne in lignes:
                debit  = ligne.get('debit') or Decimal('0')
                credit = ligne.get('credit') or Decimal('0')
                if debit and credit:
                    raise serializers.ValidationError(
                        {'lignes': 'Une ligne ne peut pas porter à la fois '
                                   'un débit et un crédit.'})
        return attrs

    def create(self, validated_data):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .models import JournalSequence

        lignes_data = validated_data.pop('lignes')
        try:
            ExerciceComptable.verifier_ouvert(validated_data['date_ecriture'])
        except DjangoValidationError as exc:
            raise serializers.ValidationError(' '.join(exc.messages))
        validated_data['numero'] = JournalSequence.next_numero(
            validated_data['journal'], validated_data['date_ecriture'].year)
        ecriture = EcritureComptable.objects.create(**validated_data)
        for index, ligne in enumerate(lignes_data):
            ligne.pop('ecriture', None)
            ligne.setdefault('ordre', index)
            LigneEcriture.objects.create(ecriture=ecriture, **ligne)
        return ecriture


class EcritureListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste du journal."""
    journalCode  = serializers.SerializerMethodField()
    totalDebit   = serializers.SerializerMethodField()
    sourceNumero = serializers.SerializerMethodField()
    estGeneree   = serializers.SerializerMethodField()

    class Meta:
        model  = EcritureComptable
        fields = ['id', 'journal', 'journalCode', 'numero', 'date_ecriture',
                  'libelle', 'sourceNumero', 'estGeneree', 'totalDebit']

    def get_journalCode(self, obj):
        return obj.journal.code

    def get_totalDebit(self, obj):
        return float(obj.total_debit())

    def get_sourceNumero(self, obj):
        if obj.document_id:
            return obj.document.numero
        if obj.paiement_id:
            return f'Paiement {obj.paiement.document.numero}'
        return None

    def get_estGeneree(self, obj):
        return obj.est_generee


class ExerciceComptableSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ExerciceComptable
        fields = ['id', 'annee', 'statut', 'cloture_at']


class DocumentListSerializer(serializers.ModelSerializer):
    """Version allégée pour les listes (sans les lignes)."""
    tiersNom      = serializers.SerializerMethodField()
    typeDisplay   = serializers.CharField(source='get_doc_type_display', read_only=True)
    statutDisplay = serializers.CharField(source='get_statut_display', read_only=True)
    estEnRetard   = serializers.SerializerMethodField()
    resteAPayer   = serializers.SerializerMethodField()

    class Meta:
        model  = Document
        fields = [
            'id', 'doc_type', 'typeDisplay', 'numero', 'statut', 'statutDisplay',
            'tiers', 'tiersNom', 'date_emission', 'date_echeance',
            'reference_externe', 'objet',
            'total_ht', 'total_tva', 'total_ttc', 'net_a_payer',
            'montant_paye', 'resteAPayer', 'estEnRetard',
        ]

    def get_tiersNom(self, obj):
        return obj.tiers.raison_sociale

    def get_estEnRetard(self, obj):
        return obj.est_en_retard

    def get_resteAPayer(self, obj):
        return obj.reste_a_payer


# ─── Durée de vie des actifs ──────────────────────────────────────────────────

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Asset
        fields = ['id', 'name', 'valeur_initiale', 'duree_annees', 'date_debut', 'created_at']
