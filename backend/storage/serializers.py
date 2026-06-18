from decimal import Decimal

from rest_framework import serializers
from .models import Categorie, Article, Entrepot, Placement, Lot, Mouvement, Stock, Ticket


class CategorieSerializer(serializers.ModelSerializer):
    parentNom    = serializers.SerializerMethodField()
    nbArticles   = serializers.SerializerMethodField()

    class Meta:
        model  = Categorie
        fields = ['id', 'code_categorie', 'nom', 'description', 'parent', 'parentNom', 'nbArticles']

    def get_parentNom(self, obj):
        return obj.parent.nom if obj.parent else None

    def get_nbArticles(self, obj):
        return obj.articles.count()


class ArticleSerializer(serializers.ModelSerializer):
    categorieNom  = serializers.SerializerMethodField()
    stockTotal    = serializers.SerializerMethodField()
    alerteStock   = serializers.SerializerMethodField()

    class Meta:
        model  = Article
        fields = [
            'id', 'code_article', 'nom', 'description',
            'categorie', 'categorieNom',
            'unite_mesure', 'prix_unitaire',
            'duree_vie_jours', 'seuil_alerte',
            'qr_code', 'code_barre', 'actif', 'date_creation',
            'stockTotal', 'alerteStock',
        ]

    def get_categorieNom(self, obj):
        return obj.categorie.nom if obj.categorie else None

    def get_stockTotal(self, obj):
        from django.db.models import Sum
        from decimal import Decimal
        total = obj.stocks.aggregate(t=Sum('quantite_disponible'))['t']
        return float(total or Decimal('0'))

    def get_alerteStock(self, obj):
        from django.db.models import Sum
        from decimal import Decimal
        total = obj.stocks.aggregate(t=Sum('quantite_disponible'))['t'] or Decimal('0')
        return float(total) <= obj.seuil_alerte


class EntrepotSerializer(serializers.ModelSerializer):
    nbPlacements = serializers.SerializerMethodField()

    class Meta:
        model  = Entrepot
        fields = [
            'id', 'code_entrepot', 'nom', 'adresse', 'ville',
            'responsable', 'capacite_max', 'statut', 'nbPlacements',
        ]

    def get_nbPlacements(self, obj):
        return obj.placements.count()


class PlacementSerializer(serializers.ModelSerializer):
    entrepotNom  = serializers.SerializerMethodField()
    entrepotCode = serializers.SerializerMethodField()
    statutDisplay = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Placement
        fields = [
            'id', 'entrepot', 'entrepotCode', 'entrepotNom',
            'code_emplacement', 'zone', 'allee', 'niveau',
            'capacite_max', 'statut', 'statutDisplay', 'qr_code',
        ]

    def get_entrepotNom(self, obj):
        return obj.entrepot.nom

    def get_entrepotCode(self, obj):
        return obj.entrepot.code_entrepot


class LotSerializer(serializers.ModelSerializer):
    articleNom   = serializers.SerializerMethodField()
    articleCode  = serializers.SerializerMethodField()
    statutDisplay = serializers.CharField(source='get_statut_display', read_only=True)
    estPerime    = serializers.SerializerMethodField()

    class Meta:
        model  = Lot
        fields = [
            'id', 'article', 'articleCode', 'articleNom',
            'numero_lot', 'date_fabrication', 'date_peremption',
            'quantite_initiale', 'statut', 'statutDisplay',
            'qr_code', 'estPerime',
        ]

    def get_articleNom(self, obj):
        return obj.article.nom

    def get_articleCode(self, obj):
        return obj.article.code_article

    def get_estPerime(self, obj):
        if obj.date_peremption is None:
            return False
        from django.utils import timezone
        return obj.date_peremption < timezone.now().date()


class MouvementSerializer(serializers.ModelSerializer):
    articleCode          = serializers.SerializerMethodField()
    articleNom           = serializers.SerializerMethodField()
    lotNumero            = serializers.SerializerMethodField()
    placementSourceCode  = serializers.SerializerMethodField()
    placementDestCode    = serializers.SerializerMethodField()
    typeMouvementDisplay = serializers.CharField(source='get_type_mouvement_display', read_only=True)
    utilisateurNom       = serializers.SerializerMethodField()

    class Meta:
        model  = Mouvement
        fields = [
            'id', 'article', 'articleCode', 'articleNom',
            'lot', 'lotNumero',
            'placement_source', 'placementSourceCode',
            'placement_destination', 'placementDestCode',
            'type_mouvement', 'typeMouvementDisplay',
            'quantite', 'date_mouvement',
            'reference_document', 'utilisateur', 'utilisateurNom', 'commentaire',
        ]
        read_only_fields = ['id', 'date_mouvement']

    def validate(self, attrs):
        typ = attrs.get('type_mouvement', getattr(self.instance, 'type_mouvement', None))
        quantite = attrs.get('quantite', getattr(self.instance, 'quantite', None))
        article = attrs.get('article', getattr(self.instance, 'article', None))
        lot = attrs.get('lot', getattr(self.instance, 'lot', None))
        placement_source = attrs.get('placement_source', getattr(self.instance, 'placement_source', None))
        placement_destination = attrs.get('placement_destination', getattr(self.instance, 'placement_destination', None))

        if quantite is not None:
            if typ in ('entree', 'sortie', 'transfert') and quantite <= 0:
                raise serializers.ValidationError(
                    {'quantite': "La quantité doit être supérieure à 0 pour ce type de mouvement."}
                )
            if typ == 'ajustement' and quantite < 0:
                raise serializers.ValidationError(
                    {'quantite': "La quantité d'ajustement ne peut pas être négative."}
                )

        if typ in ('sortie', 'transfert') and not placement_source:
            raise serializers.ValidationError(
                {'placement_source': "Un emplacement source est requis pour ce type de mouvement."}
            )

        if typ in ('entree', 'transfert', 'ajustement') and not placement_destination:
            raise serializers.ValidationError(
                {'placement_destination': "Un emplacement de destination est requis pour ce type de mouvement."}
            )

        if (typ == 'transfert' and placement_source and placement_destination
                and placement_source == placement_destination):
            raise serializers.ValidationError(
                {'placement_destination': "L'emplacement de destination doit être différent de l'emplacement source pour un transfert."}
            )

        if typ in ('sortie', 'transfert') and placement_source and article and quantite is not None:
            stock = Stock.objects.filter(article=article, placement=placement_source, lot=lot).first()
            disponible = stock.quantite_disponible if stock else Decimal('0')
            if quantite > disponible:
                raise serializers.ValidationError({
                    'quantite': (
                        f"Stock insuffisant à l'emplacement source : "
                        f"{disponible} {article.unite_mesure} disponible(s), {quantite} demandé(s)."
                    )
                })

        return attrs

    def get_articleCode(self, obj):
        return obj.article.code_article

    def get_articleNom(self, obj):
        return obj.article.nom

    def get_lotNumero(self, obj):
        return obj.lot.numero_lot if obj.lot else None

    def get_placementSourceCode(self, obj):
        if obj.placement_source:
            return f"{obj.placement_source.entrepot.code_entrepot}/{obj.placement_source.code_emplacement}"
        return None

    def get_placementDestCode(self, obj):
        if obj.placement_destination:
            return f"{obj.placement_destination.entrepot.code_entrepot}/{obj.placement_destination.code_emplacement}"
        return None

    def get_utilisateurNom(self, obj):
        if obj.utilisateur:
            return obj.utilisateur.get_full_name() or obj.utilisateur.username
        return None


class StockSerializer(serializers.ModelSerializer):
    articleCode  = serializers.SerializerMethodField()
    articleNom   = serializers.SerializerMethodField()
    articleUnite = serializers.SerializerMethodField()
    lotNumero    = serializers.SerializerMethodField()
    lotPeremption = serializers.SerializerMethodField()
    placementCode = serializers.SerializerMethodField()
    entrepotNom  = serializers.SerializerMethodField()
    alerteStock  = serializers.SerializerMethodField()
    quantiteDisponibleReelle = serializers.SerializerMethodField()
    valeur       = serializers.SerializerMethodField()

    class Meta:
        model  = Stock
        fields = [
            'id', 'article', 'articleCode', 'articleNom', 'articleUnite',
            'lot', 'lotNumero', 'lotPeremption',
            'placement', 'placementCode', 'entrepotNom',
            'quantite_disponible', 'quantite_reservee', 'quantiteDisponibleReelle',
            'valeur', 'derniere_maj', 'alerteStock',
        ]
        read_only_fields = ['quantite_reservee']

    def get_articleCode(self, obj):
        return obj.article.code_article

    def get_articleNom(self, obj):
        return obj.article.nom

    def get_articleUnite(self, obj):
        return obj.article.unite_mesure

    def get_lotNumero(self, obj):
        return obj.lot.numero_lot if obj.lot else None

    def get_lotPeremption(self, obj):
        return str(obj.lot.date_peremption) if obj.lot and obj.lot.date_peremption else None

    def get_placementCode(self, obj):
        return obj.placement.code_emplacement

    def get_entrepotNom(self, obj):
        return obj.placement.entrepot.nom

    def get_alerteStock(self, obj):
        return float(obj.quantite_disponible) <= obj.article.seuil_alerte

    def get_quantiteDisponibleReelle(self, obj):
        return float(obj.quantite_disponible - obj.quantite_reservee)

    def get_valeur(self, obj):
        return float(obj.quantite_disponible * obj.article.prix_unitaire)


class TicketSerializer(serializers.ModelSerializer):
    articleCode   = serializers.SerializerMethodField()
    lotNumero     = serializers.SerializerMethodField()
    placementCode = serializers.SerializerMethodField()
    statutDisplay = serializers.CharField(source='get_statut_display', read_only=True)
    typeDisplay   = serializers.CharField(source='get_type_source_display', read_only=True)
    utilisateurNom = serializers.SerializerMethodField()

    class Meta:
        model  = Ticket
        fields = [
            'id', 'qr_contenu', 'type_source', 'typeDisplay',
            'article', 'articleCode',
            'lot', 'lotNumero',
            'placement', 'placementCode',
            'code_barre_genere', 'mouvement',
            'date_scan', 'utilisateur', 'utilisateurNom',
            'statut', 'statutDisplay',
        ]
        read_only_fields = ['id', 'date_scan']

    def get_articleCode(self, obj):
        return obj.article.code_article if obj.article else None

    def get_lotNumero(self, obj):
        return obj.lot.numero_lot if obj.lot else None

    def get_placementCode(self, obj):
        return obj.placement.code_emplacement if obj.placement else None

    def get_utilisateurNom(self, obj):
        if obj.utilisateur:
            return obj.utilisateur.get_full_name() or obj.utilisateur.username
        return None
