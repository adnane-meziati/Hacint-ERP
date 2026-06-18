from django.contrib import admin
from .models import Article, Categorie, Entrepot, Lot, Mouvement, Placement, Stock, Ticket


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display  = ['code_categorie', 'nom', 'parent']
    search_fields = ['code_categorie', 'nom']
    list_select_related = ['parent']


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display  = ['code_article', 'nom', 'categorie', 'unite_mesure', 'prix_unitaire', 'seuil_alerte', 'date_creation']
    list_filter   = ['categorie', 'unite_mesure']
    search_fields = ['code_article', 'nom', 'code_barre', 'qr_code']
    readonly_fields = ['date_creation']


@admin.register(Entrepot)
class EntrepotAdmin(admin.ModelAdmin):
    list_display  = ['code_entrepot', 'nom', 'ville', 'responsable', 'statut']
    list_filter   = ['statut']
    search_fields = ['code_entrepot', 'nom', 'ville']


@admin.register(Placement)
class PlacementAdmin(admin.ModelAdmin):
    list_display  = ['entrepot', 'code_emplacement', 'zone', 'allee', 'niveau', 'statut']
    list_filter   = ['entrepot', 'statut']
    search_fields = ['code_emplacement', 'zone', 'qr_code']
    list_select_related = ['entrepot']


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display  = ['article', 'numero_lot', 'date_fabrication', 'date_peremption', 'quantite_initiale', 'statut']
    list_filter   = ['statut', 'article']
    search_fields = ['numero_lot', 'article__code_article', 'qr_code']
    list_select_related = ['article']


@admin.register(Mouvement)
class MouvementAdmin(admin.ModelAdmin):
    list_display  = ['date_mouvement', 'type_mouvement', 'article', 'quantite', 'lot', 'placement_source', 'placement_destination', 'utilisateur']
    list_filter   = ['type_mouvement']
    search_fields = ['article__code_article', 'reference_document', 'commentaire']
    readonly_fields = ['date_mouvement']
    list_select_related = ['article', 'lot', 'placement_source', 'placement_destination', 'utilisateur']


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display  = ['article', 'placement', 'lot', 'quantite_disponible', 'derniere_maj']
    list_filter   = ['placement__entrepot']
    search_fields = ['article__code_article', 'placement__code_emplacement']
    readonly_fields = ['derniere_maj']
    list_select_related = ['article', 'lot', 'placement', 'placement__entrepot']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display  = ['date_scan', 'type_source', 'article', 'lot', 'placement', 'statut', 'utilisateur']
    list_filter   = ['type_source', 'statut']
    search_fields = ['qr_contenu', 'code_barre_genere']
    readonly_fields = ['date_scan']
    list_select_related = ['article', 'lot', 'placement', 'utilisateur']
