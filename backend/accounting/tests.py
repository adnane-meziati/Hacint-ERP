from datetime import date
from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.test import TestCase
from rest_framework.test import APIClient

from .comptabilite import (
    balance, bilan, comptabiliser_document, comptabiliser_paiement,
    comptabiliser_tout, compte_de_produits_et_charges, grand_livre,
)
from .models import (
    CompanyProfile, CompteComptable, Document, DocumentLigne,
    DocumentSequence, EcritureComptable, ExerciceComptable, Paiement,
    TaxCode, Tiers,
)
from .tva import periode_bounds, rapport_tva


def _make_tiers(**kwargs):
    defaults = dict(
        code='CLI-001', raison_sociale='Aptiv Maroc',
        est_client=True, est_fournisseur=True,
        ice='001234567000089', if_fiscal='12345678',
        delai_paiement_jours=30,
    )
    defaults.update(kwargs)
    return Tiers.objects.create(**defaults)


def _make_document(tiers, doc_type='facture', lignes=((1, '1000.00', 'TVA20'),), **kwargs):
    document = Document.objects.create(doc_type=doc_type, tiers=tiers, **kwargs)
    for index, (qte, pu, tax) in enumerate(lignes):
        DocumentLigne.objects.create(
            document=document, ordre=index, designation=f'Ligne {index + 1}',
            quantite=Decimal(qte), prix_unitaire_ht=Decimal(pu),
            tax_code=TaxCode.objects.get(code=tax),
        )
    document.recompute_totals()
    return document


class NumerotationTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()

    def test_numero_attribue_a_la_validation_sans_rupture(self):
        annee = date.today().year
        facture1 = _make_document(self.tiers)
        facture2 = _make_document(self.tiers)
        self.assertIsNone(facture1.numero)
        facture1.valider()
        facture2.valider()
        self.assertEqual(facture1.numero, f'FAC-{annee}-00001')
        self.assertEqual(facture2.numero, f'FAC-{annee}-00002')

    def test_sequences_separees_par_type(self):
        devis = _make_document(self.tiers, doc_type='devis')
        facture = _make_document(self.tiers)
        devis.valider()
        facture.valider()
        self.assertTrue(devis.numero.startswith('DEV-'))
        self.assertTrue(facture.numero.startswith('FAC-'))

    def test_numero_jamais_reutilise_apres_suppression_brouillon(self):
        annee = date.today().year
        facture1 = _make_document(self.tiers)
        facture1.valider()
        brouillon = _make_document(self.tiers)
        brouillon.delete()
        facture2 = _make_document(self.tiers)
        facture2.valider()
        self.assertEqual(facture2.numero, f'FAC-{annee}-00002')

    def test_validation_sans_ligne_refusee(self):
        document = Document.objects.create(doc_type='facture', tiers=self.tiers)
        with self.assertRaises(Exception):
            document.valider()

    def test_ice_client_obligatoire_b2b(self):
        sans_ice = _make_tiers(code='CLI-002', ice='', est_particulier=False)
        facture = _make_document(sans_ice)
        with self.assertRaises(Exception):
            facture.valider()
        # … mais un particulier sans ICE passe
        particulier = _make_tiers(code='CLI-003', ice='', est_particulier=True)
        facture2 = _make_document(particulier)
        facture2.valider()
        self.assertIsNotNone(facture2.numero)

    def test_reference_fournisseur_obligatoire_achat(self):
        achat = _make_document(self.tiers, doc_type='facture_achat')
        with self.assertRaises(Exception):
            achat.valider()
        achat.reference_externe = 'F-FRS-889'
        achat.save()
        achat.valider()
        self.assertTrue(achat.numero.startswith('FA-'))


class CalculsTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()

    def test_totaux_multi_taux_et_remise(self):
        document = Document.objects.create(doc_type='facture', tiers=self.tiers)
        DocumentLigne.objects.create(
            document=document, designation='A', quantite=Decimal('2'),
            prix_unitaire_ht=Decimal('500.00'), remise_pct=Decimal('10'),
            tax_code=TaxCode.objects.get(code='TVA20'))
        DocumentLigne.objects.create(
            document=document, designation='B', quantite=Decimal('1'),
            prix_unitaire_ht=Decimal('200.00'),
            tax_code=TaxCode.objects.get(code='TVA10'))
        document.recompute_totals()
        # A : 2×500×0,9 = 900 HT ; TVA 180 — B : 200 HT ; TVA 20
        self.assertEqual(document.total_ht, Decimal('1100.00'))
        self.assertEqual(document.total_tva, Decimal('200.00'))
        self.assertEqual(document.total_ttc, Decimal('1300.00'))
        self.assertEqual(document.net_a_payer, Decimal('1300.00'))

    def test_retenue_a_la_source_sur_ht(self):
        document = _make_document(self.tiers, ras_type='is_ht',
                                  ras_taux=Decimal('10'))
        document.recompute_totals()
        # HT 1000, TVA 200, TTC 1200 — RAS 10 % du HT = 100 → net 1100
        self.assertEqual(document.ras_montant, Decimal('100.00'))
        self.assertEqual(document.net_a_payer, Decimal('1100.00'))

    def test_retenue_a_la_source_sur_tva(self):
        document = _make_document(self.tiers, ras_type='tva',
                                  ras_taux=Decimal('75'))
        document.recompute_totals()
        # RAS-TVA 75 % de 200 = 150 → net 1050
        self.assertEqual(document.ras_montant, Decimal('150.00'))
        self.assertEqual(document.net_a_payer, Decimal('1050.00'))


class PaiementTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()
        self.facture = _make_document(self.tiers)
        self.facture.valider()

    def test_statuts_partiel_puis_paye(self):
        Paiement.objects.create(document=self.facture, montant=Decimal('400.00'))
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.statut, 'partiellement_payee')
        Paiement.objects.create(document=self.facture, montant=Decimal('800.00'))
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.statut, 'payee')
        self.assertEqual(self.facture.montant_paye, Decimal('1200.00'))

    def test_suppression_paiement_recalcule_statut(self):
        paiement = Paiement.objects.create(
            document=self.facture, montant=Decimal('1200.00'))
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.statut, 'payee')
        paiement.delete()
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.statut, 'validee')
        self.assertEqual(self.facture.montant_paye, Decimal('0.00'))

    def test_timbre_auto_sur_especes(self):
        paiement = Paiement.objects.create(
            document=self.facture, montant=Decimal('1000.00'), mode='espece')
        # 0,25 % de 1000 = 2,50 MAD (art. 252 CGI)
        self.assertEqual(paiement.timbre_montant, Decimal('2.50'))

    def test_echeance_calculee_du_delai_tiers(self):
        self.assertIsNotNone(self.facture.date_echeance)
        delta = self.facture.date_echeance - self.facture.date_emission
        self.assertEqual(delta.days, 30)


class TvaTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()

    def test_periode_bounds(self):
        self.assertEqual(periode_bounds(2026, 2, 'mensuelle'),
                         (date(2026, 2, 1), date(2026, 2, 28)))
        self.assertEqual(periode_bounds(2026, 2, 'trimestrielle'),
                         (date(2026, 4, 1), date(2026, 6, 30)))

    def test_rapport_regime_debit(self):
        facture = _make_document(self.tiers, date_emission=date(2026, 5, 10))
        facture.valider()
        rapport = rapport_tva(2026, 5, 'mensuelle', 'debit')
        self.assertEqual(rapport['total_collectee'], 200.0)
        self.assertEqual(rapport['tva_due'], 200.0)
        # Hors période → rien
        rapport_juin = rapport_tva(2026, 6, 'mensuelle', 'debit')
        self.assertEqual(rapport_juin['total_collectee'], 0.0)

    def test_rapport_regime_encaissement_et_deductible(self):
        facture = _make_document(self.tiers, date_emission=date(2026, 4, 1))
        facture.valider()
        Paiement.objects.create(document=facture, montant=Decimal('600.00'),
                                date_paiement=date(2026, 5, 15))
        achat = _make_document(self.tiers, doc_type='facture_achat',
                               reference_externe='F-1',
                               date_emission=date(2026, 5, 2))
        achat.valider()
        Paiement.objects.create(document=achat, montant=Decimal('1200.00'),
                                date_paiement=date(2026, 5, 20))
        rapport = rapport_tva(2026, 5, 'mensuelle', 'encaissement')
        # Encaissé 600/1200 TTC → 50 % de la TVA de 200 = 100
        self.assertEqual(rapport['total_collectee'], 100.0)
        # Achat intégralement payé → 200 déductible
        self.assertEqual(rapport['total_deductible'], 200.0)
        self.assertEqual(rapport['credit_tva'], 100.0)

    def test_avoir_deduit_de_la_collectee(self):
        facture = _make_document(self.tiers, date_emission=date(2026, 5, 10))
        facture.valider()
        avoir = _make_document(self.tiers, doc_type='avoir',
                               date_emission=date(2026, 5, 20),
                               lignes=((1, '500.00', 'TVA20'),))
        avoir.valider()
        rapport = rapport_tva(2026, 5, 'mensuelle', 'debit')
        self.assertEqual(rapport['total_collectee'], 100.0)  # 200 − 100


class ApiTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        self.compta = User.objects.create_user('compta', password='x')
        self.compta.groups.add(Group.objects.get_or_create(name='Accounting')[0])
        self.designer = User.objects.create_user('designer', password='x')
        self.designer.groups.add(Group.objects.get_or_create(name='Designer')[0])
        self.tiers = _make_tiers()
        self.tax = TaxCode.objects.get(code='TVA20')

    def test_acces_refuse_aux_autres_roles(self):
        self.client_api.force_authenticate(self.designer)
        response = self.client_api.get('/api/accounting/documents/')
        self.assertEqual(response.status_code, 403)

    def test_creation_document_avec_lignes_imbriquees(self):
        self.client_api.force_authenticate(self.compta)
        response = self.client_api.post('/api/accounting/documents/', {
            'doc_type': 'facture',
            'tiers': self.tiers.pk,
            'date_emission': '2026-06-01',
            'lignes': [{
                'designation': 'Prestation usinage',
                'quantite': '2',
                'prix_unitaire_ht': '750.00',
                'tax_code': self.tax.pk,
            }],
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data['total_ttc'], '1800.00')
        self.assertEqual(response.data['statut'], 'brouillon')

    def test_document_valide_immuable(self):
        self.client_api.force_authenticate(self.compta)
        facture = _make_document(self.tiers)
        facture.valider()
        response = self.client_api.patch(
            f'/api/accounting/documents/{facture.pk}/',
            {'objet': 'tentative de modification'}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client_api.delete(f'/api/accounting/documents/{facture.pk}/')
        self.assertEqual(response.status_code, 400)

    def test_workflow_devis_facture_avoir(self):
        self.client_api.force_authenticate(self.compta)
        devis = _make_document(self.tiers, doc_type='devis')
        response = self.client_api.post(f'/api/accounting/documents/{devis.pk}/valider/')
        self.assertEqual(response.status_code, 200)

        response = self.client_api.post(
            f'/api/accounting/documents/{devis.pk}/convertir-en-facture/')
        self.assertEqual(response.status_code, 201)
        facture_id = response.data['id']
        self.assertEqual(response.data['statut'], 'brouillon')
        self.assertEqual(response.data['total_ttc'], '1200.00')

        response = self.client_api.post(
            f'/api/accounting/documents/{facture_id}/valider/')
        self.assertEqual(response.status_code, 200)

        response = self.client_api.post(
            f'/api/accounting/documents/{facture_id}/creer-avoir/')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['doc_type'], 'avoir')

    def test_paiement_excessif_refuse(self):
        self.client_api.force_authenticate(self.compta)
        facture = _make_document(self.tiers)
        facture.valider()
        response = self.client_api.post('/api/accounting/paiements/', {
            'document': facture.pk, 'montant': '1500.00',
            'date_paiement': '2026-06-01',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_pdf_genere(self):
        self.client_api.force_authenticate(self.compta)
        CompanyProfile.objects.update_or_create(pk=1, defaults={
            'raison_sociale': 'MEGAINDUS SARL', 'ice': '001111111000022',
            'if_fiscal': '1122334', 'rc': 'RC-4455', 'tp': '778899'})
        facture = _make_document(self.tiers)
        facture.valider()
        response = self.client_api.get(f'/api/accounting/documents/{facture.pk}/pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_pdf_multipage_avec_articles(self):
        """Un document de 50 lignes doit générer un PDF multi-pages valide."""
        self.client_api.force_authenticate(self.compta)
        document = Document.objects.create(doc_type='facture', tiers=self.tiers)
        from .models import DocumentLigne
        for index in range(50):
            DocumentLigne.objects.create(
                document=document, ordre=index,
                designation=f'Anvil Insulation {index}',
                quantite=Decimal('2'), prix_unitaire_ht=Decimal('15.30'),
                tax_code=self.tax)
        document.recompute_totals()
        document.valider()
        response = self.client_api.get(f'/api/accounting/documents/{document.pk}/pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_recu_paiement_pdf(self):
        self.client_api.force_authenticate(self.compta)
        facture = _make_document(self.tiers)
        facture.valider()
        paiement = Paiement.objects.create(
            document=facture, montant=Decimal('500.00'), mode='espece')
        response = self.client_api.get(f'/api/accounting/paiements/{paiement.pk}/pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_releve_deductions_xml(self):
        self.client_api.force_authenticate(self.compta)
        achat = _make_document(self.tiers, doc_type='facture_achat',
                               reference_externe='F-FRS-1',
                               date_emission=date(2026, 5, 2))
        achat.valider()
        Paiement.objects.create(document=achat, montant=Decimal('1200.00'),
                                date_paiement=date(2026, 5, 20), mode='virement')
        response = self.client_api.get(
            '/api/accounting/tva/releve-deductions/'
            '?annee=2026&periode=5&periodicite=mensuelle')
        self.assertEqual(response.status_code, 200)
        contenu = response.content.decode('utf-8')
        self.assertIn('<num>F-FRS-1</num>', contenu)
        self.assertIn('<ice>001234567000089</ice>', contenu)
        self.assertIn('<mp>4</mp>', contenu)

    def test_stats(self):
        self.client_api.force_authenticate(self.compta)
        facture = _make_document(self.tiers)
        facture.valider()
        response = self.client_api.get('/api/accounting/documents/stats/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['ca_ht'], 1000.0)


# ─── Phase 3 — Comptabilité générale ──────────────────────────────────────────

def _solde(ecriture, numero_compte):
    """(débit, crédit) agrégés d'un compte dans une écriture."""
    debit = credit = Decimal('0')
    for ligne in ecriture.lignes.all():
        if ligne.compte.numero == numero_compte:
            debit += ligne.debit
            credit += ligne.credit
    return debit, credit


class ComptabilisationTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()

    def test_ecriture_facture_vente(self):
        facture = _make_document(self.tiers)          # HT 1000, TVA 200
        facture.valider()
        ecriture = comptabiliser_document(facture)
        self.assertIsNotNone(ecriture)
        self.assertEqual(ecriture.journal.code, 'VT')
        self.assertEqual(ecriture.total_debit(), ecriture.total_credit())
        self.assertEqual(_solde(ecriture, '3421'), (Decimal('1200.00'), Decimal('0')))
        self.assertEqual(_solde(ecriture, '7121'), (Decimal('0'), Decimal('1000.00')))
        self.assertEqual(_solde(ecriture, '4455'), (Decimal('0'), Decimal('200.00')))

    def test_ecriture_achat_avec_ras(self):
        achat = _make_document(self.tiers, doc_type='facture_achat',
                               reference_externe='F-1',
                               ras_type='is_ht', ras_taux=Decimal('10'))
        achat.recompute_totals()                       # RAS 100 → net 1100
        achat.valider()
        ecriture = comptabiliser_document(achat)
        self.assertEqual(ecriture.journal.code, 'AC')
        self.assertEqual(ecriture.total_debit(), ecriture.total_credit())
        self.assertEqual(_solde(ecriture, '6121'),  (Decimal('1000.00'), Decimal('0')))
        self.assertEqual(_solde(ecriture, '34552'), (Decimal('200.00'), Decimal('0')))
        self.assertEqual(_solde(ecriture, '4411'),  (Decimal('0'), Decimal('1100.00')))
        self.assertEqual(_solde(ecriture, '4458'),  (Decimal('0'), Decimal('100.00')))

    def test_ecriture_avoir_inverse(self):
        avoir = _make_document(self.tiers, doc_type='avoir')
        avoir.valider()
        ecriture = comptabiliser_document(avoir)
        # Sens inversé : clients au crédit, ventes au débit
        self.assertEqual(_solde(ecriture, '3421'), (Decimal('0'), Decimal('1200.00')))
        self.assertEqual(_solde(ecriture, '7121'), (Decimal('1000.00'), Decimal('0')))

    def test_compte_contrepartie_personnalise(self):
        compte_service = CompteComptable.objects.get(numero='7124')
        facture = _make_document(self.tiers, compte_contrepartie=compte_service)
        facture.valider()
        ecriture = comptabiliser_document(facture)
        self.assertEqual(_solde(ecriture, '7124'), (Decimal('0'), Decimal('1000.00')))

    def test_ecriture_paiement_especes_avec_timbre(self):
        facture = _make_document(self.tiers)
        facture.valider()
        comptabiliser_document(facture)
        paiement = Paiement.objects.create(
            document=facture, montant=Decimal('1000.00'), mode='espece')
        ecriture = comptabiliser_paiement(paiement)
        self.assertEqual(ecriture.journal.code, 'CS')
        self.assertEqual(ecriture.total_debit(), ecriture.total_credit())
        self.assertEqual(_solde(ecriture, '5161'), (Decimal('1000.00'), Decimal('0')))
        self.assertEqual(_solde(ecriture, '3421'), (Decimal('0'), Decimal('1000.00')))
        self.assertEqual(_solde(ecriture, '6167'), (Decimal('2.50'), Decimal('0')))
        self.assertEqual(_solde(ecriture, '4458'), (Decimal('0'), Decimal('2.50')))

    def test_paiement_fournisseur_virement(self):
        achat = _make_document(self.tiers, doc_type='facture_achat',
                               reference_externe='F-2')
        achat.valider()
        paiement = Paiement.objects.create(document=achat, montant=Decimal('1200.00'))
        ecriture = comptabiliser_paiement(paiement)
        self.assertEqual(ecriture.journal.code, 'BQ')
        self.assertEqual(_solde(ecriture, '4411'), (Decimal('1200.00'), Decimal('0')))
        self.assertEqual(_solde(ecriture, '5141'), (Decimal('0'), Decimal('1200.00')))

    def test_idempotence_et_backfill(self):
        facture = _make_document(self.tiers)
        facture.valider()
        achat = _make_document(self.tiers, doc_type='facture_achat',
                               reference_externe='F-3')
        achat.valider()
        Paiement.objects.create(document=facture, montant=Decimal('500.00'))
        resultat = comptabiliser_tout()
        self.assertEqual(resultat, {'documents': 2, 'paiements': 1})
        # Re-comptabilisation : rien de nouveau
        self.assertEqual(comptabiliser_tout(), {'documents': 0, 'paiements': 0})
        self.assertIsNone(comptabiliser_document(facture))
        self.assertEqual(EcritureComptable.objects.count(), 3)

    def test_suppression_paiement_supprime_ecriture(self):
        facture = _make_document(self.tiers)
        facture.valider()
        paiement = Paiement.objects.create(document=facture, montant=Decimal('600.00'))
        comptabiliser_paiement(paiement)
        self.assertEqual(EcritureComptable.objects.filter(paiement=paiement).count(), 1)
        paiement.delete()
        self.assertEqual(EcritureComptable.objects.count(), 0)


class ExerciceTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()
        self.annee = date.today().year

    def test_cloture_bloque_validation_et_paiements(self):
        facture_ouverte = _make_document(self.tiers)
        facture_ouverte.valider()
        paiement = Paiement.objects.create(
            document=facture_ouverte, montant=Decimal('100.00'))

        ExerciceComptable.objects.create(annee=self.annee, statut='cloture')

        brouillon = _make_document(self.tiers)
        with self.assertRaises(Exception):
            brouillon.valider()
        with self.assertRaises(Exception):
            Paiement.objects.create(document=facture_ouverte, montant=Decimal('50.00'))
        with self.assertRaises(Exception):
            paiement.delete()

        # Réouverture → tout repasse
        ExerciceComptable.objects.filter(annee=self.annee).update(statut='ouvert')
        brouillon.valider()
        self.assertIsNotNone(brouillon.numero)


class RapportsComptablesTests(TestCase):
    def setUp(self):
        self.tiers = _make_tiers()
        facture = _make_document(self.tiers)           # vente 1000 HT / 200 TVA
        facture.valider()
        comptabiliser_document(facture)
        achat = _make_document(self.tiers, doc_type='facture_achat',
                               reference_externe='F-9',
                               lignes=((1, '400.00', 'TVA20'),))
        achat.valider()
        comptabiliser_document(achat)
        paiement = Paiement.objects.create(document=facture, montant=Decimal('1200.00'))
        comptabiliser_paiement(paiement)

    def test_balance_equilibree(self):
        data = balance()
        self.assertTrue(data['equilibree'])
        self.assertEqual(data['totaux']['debit'], data['totaux']['credit'])
        clients = next(c for c in data['comptes'] if c['numero'] == '3421')
        self.assertEqual(clients['debit'], 1200.0)
        self.assertEqual(clients['credit'], 1200.0)  # soldé par l'encaissement

    def test_grand_livre_solde_progressif(self):
        compte = CompteComptable.objects.get(numero='3421')
        data = grand_livre(compte)
        self.assertEqual(len(data['lignes']), 2)
        self.assertEqual(data['lignes'][0]['solde'], 1200.0)
        self.assertEqual(data['solde_final'], 0.0)

    def test_cpc_resultat(self):
        data = compte_de_produits_et_charges(date.today().year)
        self.assertEqual(data['total_produits'], 1000.0)
        self.assertEqual(data['total_charges'], 400.0)
        self.assertEqual(data['resultat'], 600.0)

    def test_bilan_equilibre(self):
        data = bilan(date.today())
        self.assertTrue(data['equilibre'])
        self.assertEqual(data['total_actif'], data['total_passif'])
        # Banque 1200 (D) + TVA récup 80 ; passif : TVA facturée 200,
        # fournisseurs 480, résultat 600
        self.assertEqual(data['total_actif'], 1280.0)


class EcritureApiTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        self.compta = User.objects.create_user('compta2', password='x')
        self.compta.groups.add(Group.objects.get_or_create(name='Accounting')[0])
        self.client_api.force_authenticate(self.compta)
        self.tiers = _make_tiers()

    def test_od_manuelle_equilibree(self):
        banque = CompteComptable.objects.get(numero='5141')
        capital = CompteComptable.objects.get(numero='1111')
        journal_od = 5  # id inconnu — récupérer via l'API
        from .models import Journal
        journal_od = Journal.objects.get(code='OD').pk
        response = self.client_api.post('/api/accounting/ecritures/', {
            'journal': journal_od,
            'date_ecriture': f'{date.today().year}-01-02',
            'libelle': 'Apport en capital',
            'lignes': [
                {'compte': banque.pk, 'debit': '50000.00', 'credit': '0'},
                {'compte': capital.pk, 'debit': '0', 'credit': '50000.00'},
            ],
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(response.data['numero'].startswith('OD-'))

    def test_od_desequilibree_refusee(self):
        from .models import Journal
        banque = CompteComptable.objects.get(numero='5141')
        capital = CompteComptable.objects.get(numero='1111')
        response = self.client_api.post('/api/accounting/ecritures/', {
            'journal': Journal.objects.get(code='OD').pk,
            'date_ecriture': f'{date.today().year}-01-02',
            'libelle': 'Erreur',
            'lignes': [
                {'compte': banque.pk, 'debit': '100.00', 'credit': '0'},
                {'compte': capital.pk, 'debit': '0', 'credit': '90.00'},
            ],
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_ecriture_generee_non_supprimable(self):
        facture = _make_document(self.tiers)
        facture.valider()
        ecriture = comptabiliser_document(facture)
        response = self.client_api.delete(f'/api/accounting/ecritures/{ecriture.pk}/')
        self.assertEqual(response.status_code, 400)

    def test_validation_api_genere_ecriture(self):
        facture = _make_document(self.tiers)
        response = self.client_api.post(
            f'/api/accounting/documents/{facture.pk}/valider/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(EcritureComptable.objects.filter(document=facture).exists())

    def test_paiement_api_genere_ecriture(self):
        facture = _make_document(self.tiers)
        facture.valider()
        response = self.client_api.post('/api/accounting/paiements/', {
            'document': facture.pk, 'montant': '300.00',
            'date_paiement': date.today().isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            EcritureComptable.objects.filter(paiement__isnull=False).count(), 1)

    def test_exercice_cloture_api(self):
        annee = date.today().year
        response = self.client_api.post('/api/accounting/exercices/cloturer/',
                                        {'annee': annee}, format='json')
        self.assertEqual(response.status_code, 200)
        facture = _make_document(self.tiers)
        response = self.client_api.post(
            f'/api/accounting/documents/{facture.pk}/valider/')
        self.assertEqual(response.status_code, 400)
        response = self.client_api.post('/api/accounting/exercices/rouvrir/',
                                        {'annee': annee}, format='json')
        self.assertEqual(response.status_code, 200)
