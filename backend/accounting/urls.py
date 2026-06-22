from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssetViewSet, CompteComptableViewSet, DocumentViewSet, EcritureViewSet,
    JournalViewSet, PaiementViewSet, TaxCodeViewSet, TiersViewSet,
    accounting_departments_view,
    balance_view, bilan_view, company_profile_view, comptabiliser_tout_view,
    cpc_view, exercice_cloturer_view, exercice_rouvrir_view, exercices_view,
    grand_livre_view, journal_export_view, tva_export_xlsx_view,
    tva_rapport_view, tva_releve_deductions_view,
)

router = DefaultRouter()
router.register(r'tiers',      TiersViewSet,           basename='tiers')
router.register(r'taxcodes',   TaxCodeViewSet,         basename='taxcode')
router.register(r'documents',  DocumentViewSet,        basename='document')
router.register(r'paiements',  PaiementViewSet,        basename='paiement')
router.register(r'comptes',    CompteComptableViewSet, basename='compte')
router.register(r'journaux',   JournalViewSet,         basename='journal')
router.register(r'ecritures',  EcritureViewSet,        basename='ecriture')
router.register(r'assets',     AssetViewSet,           basename='asset')

urlpatterns = [
    path('societe/',                company_profile_view),
    path('departments/',            accounting_departments_view),
    path('tva/rapport/',            tva_rapport_view),
    path('tva/releve-deductions/',  tva_releve_deductions_view),
    path('tva/export/',             tva_export_xlsx_view),
    # Comptabilité générale
    path('exercices/',              exercices_view),
    path('exercices/cloturer/',     exercice_cloturer_view),
    path('exercices/rouvrir/',      exercice_rouvrir_view),
    path('comptabiliser-tout/',     comptabiliser_tout_view),
    path('grand-livre/',            grand_livre_view),
    path('balance/',                balance_view),
    path('journal-export/',         journal_export_view),
    path('bilan/',                  bilan_view),
    path('cpc/',                    cpc_view),
    path('', include(router.urls)),
]
