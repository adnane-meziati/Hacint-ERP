from django.contrib import admin

from .models import (
    Asset, CompanyProfile, CompteComptable, Document, DocumentLigne,
    DocumentSequence, EcritureComptable, ExerciceComptable, Journal,
    LigneEcriture, Paiement, TaxCode, Tiers, UserAsset,
)


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ['raison_sociale', 'ice', 'if_fiscal', 'rc', 'tva_regime']


@admin.register(Tiers)
class TiersAdmin(admin.ModelAdmin):
    list_display  = ['code', 'raison_sociale', 'ice', 'est_client', 'est_fournisseur', 'actif']
    list_filter   = ['est_client', 'est_fournisseur', 'actif']
    search_fields = ['code', 'raison_sociale', 'ice', 'if_fiscal']


@admin.register(TaxCode)
class TaxCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'taux', 'actif']


class DocumentLigneInline(admin.TabularInline):
    model = DocumentLigne
    extra = 0
    readonly_fields = ['montant_ht', 'montant_tva', 'montant_ttc']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display  = ['numero', 'doc_type', 'statut', 'tiers', 'date_emission',
                     'total_ttc', 'montant_paye']
    list_filter   = ['doc_type', 'statut']
    search_fields = ['numero', 'reference_externe', 'tiers__raison_sociale']
    inlines       = [DocumentLigneInline]
    readonly_fields = ['numero', 'total_ht', 'total_tva', 'total_ttc',
                       'ras_montant', 'net_a_payer', 'montant_paye',
                       'validated_at', 'validated_by']


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['document', 'date_paiement', 'montant', 'mode', 'timbre_montant']
    list_filter  = ['mode']


@admin.register(DocumentSequence)
class DocumentSequenceAdmin(admin.ModelAdmin):
    list_display = ['doc_type', 'annee', 'dernier_numero']


@admin.register(CompteComptable)
class CompteComptableAdmin(admin.ModelAdmin):
    list_display  = ['numero', 'intitule', 'actif']
    search_fields = ['numero', 'intitule']


@admin.register(Journal)
class JournalAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'type_journal']


class LigneEcritureInline(admin.TabularInline):
    model = LigneEcriture
    extra = 0


@admin.register(EcritureComptable)
class EcritureComptableAdmin(admin.ModelAdmin):
    list_display  = ['numero', 'journal', 'date_ecriture', 'libelle']
    list_filter   = ['journal']
    search_fields = ['numero', 'libelle']
    inlines       = [LigneEcritureInline]


@admin.register(ExerciceComptable)
class ExerciceComptableAdmin(admin.ModelAdmin):
    list_display = ['annee', 'statut', 'cloture_at']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display  = ['name', 'asset_type', 'department', 'max_hours', 'created_at']
    list_filter   = ['asset_type', 'department']
    search_fields = ['name']


@admin.register(UserAsset)
class UserAssetAdmin(admin.ModelAdmin):
    list_display  = ['user', 'asset']
    list_filter   = ['asset']
    search_fields = ['user__username', 'asset__name']
