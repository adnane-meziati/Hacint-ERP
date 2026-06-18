from datetime import date as date_cls, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from .comptabilite import (
    balance, bilan, comptabiliser_document, comptabiliser_paiement,
    comptabiliser_tout, compte_de_produits_et_charges, export_balance_xlsx,
    export_grand_livre_xlsx, export_journal_xlsx, grand_livre,
)
from .models import (
    DOC_TYPES_FACTURE, Asset, CompanyProfile, CompteComptable, Document,
    EcritureComptable, ExerciceComptable, Journal, Paiement, TaxCode, Tiers,
)
from .pdf import generate_document_pdf, generate_paiement_pdf
from .serializers import (
    AssetSerializer, CompanyProfileSerializer, CompteComptableSerializer,
    DocumentListSerializer, DocumentSerializer, EcritureComptableSerializer,
    EcritureListSerializer, ExerciceComptableSerializer, JournalSerializer,
    PaiementSerializer, TaxCodeSerializer, TiersSerializer,
)
from .tva import export_tva_xlsx, rapport_tva, releve_deductions_xml


class AccountingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class IsAccountingUser(BasePermission):
    """Allow staff/superusers and members of the 'Accounting' group only."""

    message = "Vous n'avez pas accès au module Comptabilité."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.is_staff or user.is_superuser or
                user.groups.filter(name='Accounting').exists()
            )
        )


# ─── Profil société ───────────────────────────────────────────────────────────

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAccountingUser])
def company_profile_view(request):
    profile = CompanyProfile.get_solo()
    if request.method == 'GET':
        return Response(CompanyProfileSerializer(profile).data)
    serializer = CompanyProfileSerializer(
        profile, data=request.data, partial=(request.method == 'PATCH'))
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ─── Tiers ────────────────────────────────────────────────────────────────────

class TiersViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    serializer_class   = TiersSerializer
    pagination_class   = AccountingPagination
    filter_backends    = [filters.OrderingFilter]
    ordering           = ['code']

    def get_queryset(self):
        qs = Tiers.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(code__icontains=search) | Q(raison_sociale__icontains=search) |
                Q(ice__icontains=search) | Q(if_fiscal__icontains=search)
            )
        type_tiers = self.request.query_params.get('type')
        if type_tiers == 'client':
            qs = qs.filter(est_client=True)
        elif type_tiers == 'fournisseur':
            qs = qs.filter(est_fournisseur=True)
        actif = self.request.query_params.get('actif')
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ('1', 'true', 'oui'))
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.documents.exists():
            return Response(
                {'error': "Ce tiers a des documents — désactivez-le (Actif = non) "
                          "au lieu de le supprimer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='search')
    def search_light(self, request):
        q = request.query_params.get('q', '').strip()
        type_tiers = request.query_params.get('type', '')
        if not q:
            return Response([])
        qs = Tiers.objects.filter(
            Q(code__icontains=q) | Q(raison_sociale__icontains=q) | Q(ice__icontains=q),
            actif=True,
        )
        if type_tiers == 'client':
            qs = qs.filter(est_client=True)
        elif type_tiers == 'fournisseur':
            qs = qs.filter(est_fournisseur=True)
        return Response(list(qs.values(
            'id', 'code', 'raison_sociale', 'ice', 'est_particulier',
            'delai_paiement_jours')[:20]))


# ─── Codes TVA ────────────────────────────────────────────────────────────────

class TaxCodeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    serializer_class   = TaxCodeSerializer
    queryset           = TaxCode.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.lignes.exists():
            return Response(
                {'error': "Ce code TVA est utilisé par des documents — "
                          "désactivez-le au lieu de le supprimer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


# ─── Documents ────────────────────────────────────────────────────────────────

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    pagination_class   = AccountingPagination
    filter_backends    = [filters.OrderingFilter]
    ordering           = ['-date_emission', '-id']

    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        return DocumentSerializer

    def get_queryset(self):
        qs = (
            Document.objects
            .select_related('tiers', 'document_origine')
            .prefetch_related('lignes__tax_code', 'lignes__article')
        )
        doc_type = self.request.query_params.get('doc_type')
        if doc_type:
            qs = qs.filter(doc_type__in=doc_type.split(','))
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut__in=statut.split(','))
        tiers = self.request.query_params.get('tiers')
        if tiers:
            qs = qs.filter(tiers_id=tiers)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(numero__icontains=search) | Q(objet__icontains=search) |
                Q(reference_externe__icontains=search) |
                Q(tiers__raison_sociale__icontains=search) |
                Q(tiers__code__icontains=search)
            )
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_emission__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_emission__lte=date_to)
        if self.request.query_params.get('en_retard'):
            qs = qs.filter(
                doc_type__in=DOC_TYPES_FACTURE,
                statut__in=['validee', 'partiellement_payee'],
                date_echeance__lt=timezone.localdate())
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.est_brouillon:
            return Response(
                {'error': 'Un document validé ne peut pas être supprimé '
                          '(numérotation sans rupture) — créez un avoir.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    # ── Actions du cycle de vie ───────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        document = self.get_object()
        try:
            with transaction.atomic():
                document.valider(user=request.user)
                # Comptabilisation automatique (journal VT / AC)
                comptabiliser_document(document, user=request.user)
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(DocumentSerializer(document).data)

    @action(detail=True, methods=['post'], url_path='set-statut')
    def set_statut(self, request, pk=None):
        """Transitions simples des devis (accepté / refusé / expiré)."""
        document = self.get_object()
        nouveau = request.data.get('statut')
        if document.doc_type != 'devis':
            return Response({'error': 'Réservé aux devis.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if document.statut == 'brouillon' or nouveau not in ('envoye', 'accepte', 'refuse', 'expire'):
            return Response({'error': 'Transition invalide.'},
                            status=status.HTTP_400_BAD_REQUEST)
        document.statut = nouveau
        document.save(update_fields=['statut', 'updated_at'])
        return Response(DocumentSerializer(document).data)

    @action(detail=True, methods=['post'], url_path='convertir-en-facture')
    def convertir_en_facture(self, request, pk=None):
        """Crée une facture brouillon à partir d'un devis accepté/envoyé."""
        devis = self.get_object()
        if devis.doc_type != 'devis':
            return Response({'error': 'Seul un devis peut être converti en facture.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if devis.statut not in ('envoye', 'accepte'):
            return Response({'error': 'Le devis doit être validé (envoyé ou accepté).'},
                            status=status.HTTP_400_BAD_REQUEST)
        facture = self._dupliquer(devis, 'facture', request.user)
        devis.statut = 'accepte'
        devis.save(update_fields=['statut', 'updated_at'])
        return Response(DocumentSerializer(facture).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='creer-avoir')
    def creer_avoir(self, request, pk=None):
        """Crée un avoir brouillon (total) à partir d'une facture validée."""
        facture = self.get_object()
        if facture.doc_type not in DOC_TYPES_FACTURE:
            return Response({'error': "Un avoir ne peut être créé que depuis une facture."},
                            status=status.HTTP_400_BAD_REQUEST)
        if facture.est_brouillon:
            return Response({'error': 'La facture doit être validée.'},
                            status=status.HTTP_400_BAD_REQUEST)
        type_avoir = 'avoir' if facture.doc_type == 'facture' else 'avoir_achat'
        avoir = self._dupliquer(facture, type_avoir, request.user)
        return Response(DocumentSerializer(avoir).data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _dupliquer(source, doc_type, user):
        with transaction.atomic():
            copie = Document.objects.create(
                doc_type=doc_type,
                tiers=source.tiers,
                date_emission=timezone.localdate(),
                reference_externe=source.reference_externe,
                objet=source.objet,
                document_origine=source,
                ras_type=source.ras_type,
                ras_taux=source.ras_taux,
                notes=source.notes,
                created_by=user,
            )
            for ligne in source.lignes.all():
                ligne.pk = None
                ligne.document = copie
                ligne.save()
            copie.recompute_totals()
        return copie

    # ── PDF ───────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        document = self.get_object()
        company = CompanyProfile.get_solo()
        try:
            contenu = generate_document_pdf(document, company)
        except ImportError:
            return Response(
                {'error': "Le module 'reportlab' n'est pas installé — "
                          "exécutez : pip install -r requirements.txt "
                          "(ou reconstruisez l'image Docker)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        nom = document.numero or f'{document.doc_type}-brouillon-{document.pk}'
        response = HttpResponse(contenu, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{nom}.pdf"'
        return response

    # ── Statistiques (cartes du tableau de bord) ──────────────────────────────

    @action(detail=False, methods=['get'])
    def stats(self, request):
        annee = int(request.query_params.get('annee', timezone.localdate().year))
        factures = Document.objects.filter(
            doc_type='facture', date_emission__year=annee,
            statut__in=['validee', 'partiellement_payee', 'payee'])
        avoirs = Document.objects.filter(
            doc_type='avoir', date_emission__year=annee, statut='validee')
        achats = Document.objects.filter(
            doc_type='facture_achat', date_emission__year=annee,
            statut__in=['validee', 'partiellement_payee', 'payee'])
        impayes = Document.objects.filter(
            doc_type__in=DOC_TYPES_FACTURE,
            statut__in=['validee', 'partiellement_payee'])
        en_retard = impayes.filter(date_echeance__lt=timezone.localdate())

        def _sum(qs, field):
            return float(qs.aggregate(t=Sum(field))['t'] or 0)

        return Response({
            'annee': annee,
            'ca_ht': _sum(factures, 'total_ht') - _sum(avoirs, 'total_ht'),
            'ca_ttc': _sum(factures, 'total_ttc') - _sum(avoirs, 'total_ttc'),
            'achats_ht': _sum(achats, 'total_ht'),
            'encours_clients': _sum(
                impayes.filter(doc_type='facture'), 'net_a_payer'
            ) - _sum(impayes.filter(doc_type='facture'), 'montant_paye'),
            'encours_fournisseurs': _sum(
                impayes.filter(doc_type='facture_achat'), 'net_a_payer'
            ) - _sum(impayes.filter(doc_type='facture_achat'), 'montant_paye'),
            'nb_en_retard': en_retard.count(),
        })


# ─── Paiements ────────────────────────────────────────────────────────────────

class PaiementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    serializer_class   = PaiementSerializer
    pagination_class   = AccountingPagination
    http_method_names  = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = Paiement.objects.select_related('document', 'document__tiers')
        document = self.request.query_params.get('document')
        if document:
            qs = qs.filter(document_id=document)
        doc_type = self.request.query_params.get('doc_type')
        if doc_type:
            qs = qs.filter(document__doc_type=doc_type)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(document__numero__icontains=search) | Q(reference__icontains=search) |
                Q(document__tiers__raison_sociale__icontains=search)
            )
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_paiement__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_paiement__lte=date_to)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError as DrfValidationError
        try:
            with transaction.atomic():
                paiement = serializer.save(created_by=self.request.user)
                # Comptabilisation automatique (journal BQ / CS)
                comptabiliser_paiement(paiement, user=self.request.user)
        except DjangoValidationError as exc:
            raise DrfValidationError(' '.join(exc.messages))

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)},
                            status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        paiement = self.get_object()
        company = CompanyProfile.get_solo()
        try:
            contenu = generate_paiement_pdf(paiement, company)
        except ImportError:
            return Response(
                {'error': "Le module 'reportlab' n'est pas installé — "
                          "exécutez : pip install -r requirements.txt "
                          "(ou reconstruisez l'image Docker)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        response = HttpResponse(contenu, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'inline; filename="RECU-{paiement.pk:05d}.pdf"')
        return response


# ─── Rapport TVA + exports ────────────────────────────────────────────────────

def _params_periode(request):
    company = CompanyProfile.get_solo()
    today = timezone.localdate()
    periodicite = request.query_params.get('periodicite') or company.tva_periodicite
    if periodicite not in ('mensuelle', 'trimestrielle'):
        periodicite = 'trimestrielle'
    defaut = today.month if periodicite == 'mensuelle' else (today.month - 1) // 3 + 1
    annee   = int(request.query_params.get('annee', today.year))
    periode = int(request.query_params.get('periode', defaut))
    regime  = request.query_params.get('regime') or company.tva_regime
    if regime not in ('encaissement', 'debit'):
        regime = 'encaissement'
    return company, annee, periode, periodicite, regime


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def tva_rapport_view(request):
    company, annee, periode, periodicite, regime = _params_periode(request)
    try:
        return Response(rapport_tva(annee, periode, periodicite, regime))
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def tva_releve_deductions_view(request):
    company, annee, periode, periodicite, _ = _params_periode(request)
    try:
        contenu = releve_deductions_xml(company, annee, periode, periodicite)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    response = HttpResponse(contenu, content_type='application/xml')
    response['Content-Disposition'] = (
        f'attachment; filename="releve_deductions_{annee}_{periode}.xml"')
    return response


# ═══════════════════════════════════════════════════════════════════════════════
# COMPTABILITÉ GÉNÉRALE — plan comptable, écritures, exercices, rapports
# ═══════════════════════════════════════════════════════════════════════════════

class CompteComptableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    serializer_class   = CompteComptableSerializer
    pagination_class   = AccountingPagination

    def get_queryset(self):
        qs = CompteComptable.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(numero__istartswith=search) | Q(intitule__icontains=search))
        classe = self.request.query_params.get('classe')
        if classe:
            qs = qs.filter(numero__startswith=classe)
        actif = self.request.query_params.get('actif')
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ('1', 'true', 'oui'))
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.lignes.exists() or instance.documents.exists():
            return Response(
                {'error': 'Ce compte porte des écritures — désactivez-le '
                          'au lieu de le supprimer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='search')
    def search_light(self, request):
        q = request.query_params.get('q', '').strip()
        classe = request.query_params.get('classe', '')
        qs = CompteComptable.objects.filter(actif=True)
        if classe:
            qs = qs.filter(numero__startswith=classe)
        if q:
            qs = qs.filter(Q(numero__istartswith=q) | Q(intitule__icontains=q))
        return Response(list(qs.values('id', 'numero', 'intitule')[:25]))


class JournalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    serializer_class   = JournalSerializer
    queryset           = Journal.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.ecritures.exists():
            return Response(
                {'error': 'Ce journal contient des écritures — suppression impossible.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class EcritureViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    pagination_class   = AccountingPagination
    http_method_names  = ['get', 'post', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return EcritureListSerializer
        return EcritureComptableSerializer

    def get_queryset(self):
        qs = (
            EcritureComptable.objects
            .select_related('journal', 'document', 'paiement__document')
            .prefetch_related('lignes__compte', 'lignes__tiers')
        )
        journal = self.request.query_params.get('journal')
        if journal:
            qs = qs.filter(journal__code=journal)
        compte = self.request.query_params.get('compte')
        if compte:
            qs = qs.filter(lignes__compte__numero__startswith=compte).distinct()
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(numero__icontains=search) | Q(libelle__icontains=search) |
                Q(document__numero__icontains=search)
            )
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_ecriture__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_ecriture__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.est_generee:
            return Response(
                {'error': 'Écriture générée automatiquement — elle suit son '
                          'document ou paiement d\'origine et ne peut pas être '
                          'supprimée directement.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            ExerciceComptable.verifier_ouvert(instance.date_ecriture)
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)},
                            status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


# ─── Exercices comptables ─────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAccountingUser])
def exercices_view(request):
    """Années comptables connues (documents + écritures) avec leur statut."""
    annees = set(
        Document.objects.dates('date_emission', 'year').values_list(
            'date_emission__year', flat=True))
    annees |= set(
        EcritureComptable.objects.dates('date_ecriture', 'year').values_list(
            'date_ecriture__year', flat=True))
    annees |= set(ExerciceComptable.objects.values_list('annee', flat=True))
    annees.add(timezone.localdate().year)
    statuts = {e.annee: e for e in ExerciceComptable.objects.all()}
    resultat = []
    for annee in sorted(annees, reverse=True):
        exercice = statuts.get(annee)
        resultat.append({
            'annee': annee,
            'statut': exercice.statut if exercice else 'ouvert',
            'cloture_at': exercice.cloture_at if exercice else None,
        })
    return Response(resultat)


@api_view(['POST'])
@permission_classes([IsAccountingUser])
def exercice_cloturer_view(request):
    annee = int(request.data.get('annee', 0))
    if not annee:
        return Response({'error': 'Année requise.'}, status=status.HTTP_400_BAD_REQUEST)
    brouillons = Document.objects.filter(
        date_emission__year=annee, statut='brouillon').count()
    exercice, _ = ExerciceComptable.objects.get_or_create(annee=annee)
    exercice.statut = 'cloture'
    exercice.cloture_at = timezone.now()
    exercice.cloture_by = request.user
    exercice.save()
    return Response({
        'annee': annee, 'statut': 'cloture',
        'avertissement': (f'{brouillons} brouillon(s) daté(s) de {annee} '
                          'resteront non comptabilisés.') if brouillons else None,
    })


@api_view(['POST'])
@permission_classes([IsAccountingUser])
def exercice_rouvrir_view(request):
    annee = int(request.data.get('annee', 0))
    try:
        exercice = ExerciceComptable.objects.get(annee=annee)
    except ExerciceComptable.DoesNotExist:
        return Response({'error': 'Exercice introuvable.'},
                        status=status.HTTP_404_NOT_FOUND)
    exercice.statut = 'ouvert'
    exercice.save(update_fields=['statut'])
    return Response({'annee': annee, 'statut': 'ouvert'})


# ─── Comptabilisation de l'existant (backfill) ───────────────────────────────

@api_view(['POST'])
@permission_classes([IsAccountingUser])
def comptabiliser_tout_view(request):
    try:
        with transaction.atomic():
            resultat = comptabiliser_tout(user=request.user)
    except DjangoValidationError as exc:
        return Response({'error': ' '.join(exc.messages)},
                        status=status.HTTP_400_BAD_REQUEST)
    return Response(resultat)


# ─── Rapports comptables ──────────────────────────────────────────────────────

def _dates_params(request):
    return (request.query_params.get('date_from') or None,
            request.query_params.get('date_to') or None)


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def grand_livre_view(request):
    numero = request.query_params.get('compte', '').strip()
    if not numero:
        return Response({'error': 'Paramètre « compte » requis.'},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        compte = CompteComptable.objects.get(numero=numero)
    except CompteComptable.DoesNotExist:
        return Response({'error': f'Compte {numero} introuvable.'},
                        status=status.HTTP_404_NOT_FOUND)
    date_from, date_to = _dates_params(request)
    if request.query_params.get('format') == 'xlsx':
        contenu = export_grand_livre_xlsx(compte, date_from, date_to)
        response = HttpResponse(
            contenu,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = (
            f'attachment; filename="grand_livre_{numero}.xlsx"')
        return response
    return Response(grand_livre(compte, date_from, date_to))


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def balance_view(request):
    date_from, date_to = _dates_params(request)
    if request.query_params.get('format') == 'xlsx':
        contenu = export_balance_xlsx(date_from, date_to)
        response = HttpResponse(
            contenu,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="balance.xlsx"'
        return response
    return Response(balance(date_from, date_to))


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def journal_export_view(request):
    date_from, date_to = _dates_params(request)
    journal_code = request.query_params.get('journal') or None
    contenu = export_journal_xlsx(date_from, date_to, journal_code)
    response = HttpResponse(
        contenu,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="livre_journal.xlsx"'
    return response


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def bilan_view(request):
    date_to = request.query_params.get('date_to') or timezone.localdate().isoformat()
    from datetime import date as date_type
    try:
        date_to = date_type.fromisoformat(date_to)
    except ValueError:
        return Response({'error': 'Date invalide.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(bilan(date_to))


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def cpc_view(request):
    annee = int(request.query_params.get('annee', timezone.localdate().year))
    return Response(compte_de_produits_et_charges(annee))


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def tva_export_xlsx_view(request):
    company, annee, periode, periodicite, regime = _params_periode(request)
    try:
        contenu = export_tva_xlsx(company, annee, periode, periodicite, regime)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    response = HttpResponse(
        contenu,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = (
        f'attachment; filename="tva_{annee}_{periode}_{date_cls.today():%Y%m%d}.xlsx"')
    return response


# ═══════════════════════════════════════════════════════════════════════════════
# DURÉE DE VIE DES ACTIFS — machines, PC, outils
# ═══════════════════════════════════════════════════════════════════════════════

def _asset_lifespan_data():
    from decimal import Decimal as D
    assets = Asset.objects.all()
    today = timezone.localdate()

    items = []
    total_valeur_initiale = D('0')
    total_valeur_actuelle = D('0')

    for asset in assets:
        valeur = asset.valeur_initiale or D('0')
        annees = asset.duree_annees or 1
        total_mois = annees * 12

        amort_mensuel = round(float(valeur) / total_mois, 2) if total_mois > 0 else 0.0
        pct_mensuel = round(100.0 / total_mois, 4) if total_mois > 0 else 0.0

        date_debut = asset.date_debut or asset.created_at.date()
        mois_ecoules = (today.year - date_debut.year) * 12 + (today.month - date_debut.month)
        mois_ecoules = max(0, min(mois_ecoules, total_mois))

        valeur_f = float(valeur)
        valeur_perdue = round(amort_mensuel * mois_ecoules, 2)
        valeur_actuelle = max(0.0, round(valeur_f - valeur_perdue, 2))
        pct_perdu = round((valeur_perdue / valeur_f) * 100.0, 1) if valeur_f > 0 else 0.0

        items.append({
            'id': asset.id,
            'name': asset.name,
            'valeur_initiale': valeur_f,
            'duree_annees': annees,
            'date_debut': date_debut.isoformat(),
            'amort_mensuel': amort_mensuel,
            'pct_mensuel': pct_mensuel,
            'mois_ecoules': mois_ecoules,
            'total_mois': total_mois,
            'valeur_perdue': valeur_perdue,
            'valeur_actuelle': valeur_actuelle,
            'pct_perdu': pct_perdu,
        })

        total_valeur_initiale += valeur
        total_valeur_actuelle += D(str(valeur_actuelle))

    return {
        'summary': {
            'total_assets': len(items),
            'total_valeur_initiale': float(total_valeur_initiale),
            'total_valeur_actuelle': float(total_valeur_actuelle),
        },
        'assets': items,
    }


class AssetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAccountingUser]
    serializer_class   = AssetSerializer
    queryset           = Asset.objects.select_related('department')
    pagination_class   = None

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.utilisateurs.exists():
            return Response(
                {'error': 'Cet actif est affecté à des utilisateurs — '
                          'retirez ces affectations avant de le supprimer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def lifespan(self, request):
        return Response(_asset_lifespan_data())


@api_view(['GET'])
@permission_classes([IsAccountingUser])
def accounting_departments_view(request):
    """Liste légère des départements (lecture seule) pour les formulaires du
    module Comptabilité — hr.Department n'est pas exposé aux comptables."""
    from hr.models import Department
    return Response(list(Department.objects.values('id', 'name').order_by('name')))
