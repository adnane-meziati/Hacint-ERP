"""End-to-end tests for the Storage (Stockage) module.

Covers the bug fixes and missing-feature additions identified in the
production-readiness review: role-based authorization, movement
validation (insufficient stock, missing placements, ajustement rules),
stock uniqueness, lot expiration, soft-delete protections, CSV
import/export, movement reversal, stock reservation, placement
capacity tracking and the self-transfer guard.
"""
import csv as csv_module
import io
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Article, Categorie, Entrepot, Lot, Mouvement, Placement, Stock, Ticket


def make_storage_user(username='storage1'):
    user = User.objects.create_user(username=username, password='pass1234')
    group, _ = Group.objects.get_or_create(name='Storage')
    user.groups.add(group)
    return user


def csv_file(header, rows, name='import.csv'):
    buf = io.StringIO()
    writer = csv_module.writer(buf)
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    return SimpleUploadedFile(name, buf.getvalue().encode('utf-8-sig'), content_type='text/csv')


# ─── Bug #1 — role-based authorization on Storage API ─────────────────────────

ENDPOINTS = [
    '/api/storage/articles/',
    '/api/storage/categories/',
    '/api/storage/entrepots/',
    '/api/storage/placements/',
    '/api/storage/lots/',
    '/api/storage/mouvements/',
    '/api/storage/stocks/',
    '/api/storage/tickets/',
]


class PermissionTests(APITestCase):
    def test_anonymous_blocked_on_all_endpoints(self):
        for url in ENDPOINTS:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_storage_user_blocked_on_all_endpoints(self):
        user = User.objects.create_user(username='outsider', password='pass1234')
        self.client.force_authenticate(user=user)
        for url in ENDPOINTS:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_storage_group_user_allowed_on_all_endpoints(self):
        user = make_storage_user('storageguy')
        self.client.force_authenticate(user=user)
        for url in ENDPOINTS:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_staff_user_allowed_without_storage_group(self):
        user = User.objects.create_user(username='staffer', password='pass1234', is_staff=True)
        self.client.force_authenticate(user=user)
        resp = self.client.get('/api/storage/articles/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ─── Shared fixtures ────────────────────────────────────────────────────────────

class StorageAPITestCase(APITestCase):
    def setUp(self):
        self.user = make_storage_user()
        self.client.force_authenticate(user=self.user)
        self.categorie = Categorie.objects.create(code_categorie='CAT1', nom='Catégorie test')
        self.article = Article.objects.create(
            code_article='ART-001', nom='Article test', categorie=self.categorie,
            unite_mesure='pcs', prix_unitaire=Decimal('10.00'), seuil_alerte=5,
        )
        self.entrepot = Entrepot.objects.create(code_entrepot='ENT1', nom='Entrepôt test')
        self.placement_a = Placement.objects.create(entrepot=self.entrepot, code_emplacement='A1')
        self.placement_b = Placement.objects.create(entrepot=self.entrepot, code_emplacement='A2')

    def entree(self, qty='10', placement=None, lot=None, **extra):
        payload = {
            'article': self.article.id,
            'type_mouvement': 'entree',
            'placement_destination': (placement or self.placement_a).id,
            'quantite': qty,
        }
        if lot:
            payload['lot'] = lot.id
        payload.update(extra)
        return self.client.post('/api/storage/mouvements/', payload)

    def sortie(self, qty, placement=None, lot=None, **extra):
        payload = {
            'article': self.article.id,
            'type_mouvement': 'sortie',
            'placement_source': (placement or self.placement_a).id,
            'quantite': qty,
        }
        if lot:
            payload['lot'] = lot.id
        payload.update(extra)
        return self.client.post('/api/storage/mouvements/', payload)

    def stock_at(self, placement=None, lot=None):
        return Stock.objects.get(article=self.article, placement=placement or self.placement_a, lot=lot)


# ─── Bugs #2, #3, #4, #7 — movement validation ─────────────────────────────────

class StockMovementValidationTests(StorageAPITestCase):
    def test_entree_creates_stock(self):
        resp = self.entree(qty='10')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(self.stock_at().quantite_disponible, Decimal('10.00'))

    def test_sortie_insufficient_stock_rejected_not_clamped(self):
        self.entree(qty='5')
        resp = self.sortie('10')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantite', resp.data)
        self.assertEqual(self.stock_at().quantite_disponible, Decimal('5.00'))

    def test_transfert_insufficient_stock_rejected(self):
        self.entree(qty='3')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id,
            'type_mouvement': 'transfert',
            'placement_source': self.placement_a.id,
            'placement_destination': self.placement_b.id,
            'quantite': '5',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantite', resp.data)

    def test_sortie_requires_placement_source(self):
        self.entree(qty='5')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'sortie', 'quantite': '1',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('placement_source', resp.data)

    def test_transfert_requires_placement_destination(self):
        self.entree(qty='5')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id,
            'type_mouvement': 'transfert',
            'placement_source': self.placement_a.id,
            'quantite': '1',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('placement_destination', resp.data)

    def test_entree_requires_placement_destination(self):
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'entree', 'quantite': '1',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('placement_destination', resp.data)

    def test_ajustement_negative_rejected(self):
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'ajustement',
            'placement_destination': self.placement_a.id, 'quantite': '-5',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ajustement_zero_allowed_and_sets_absolute_value(self):
        self.entree(qty='5')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'ajustement',
            'placement_destination': self.placement_a.id, 'quantite': '0',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(self.stock_at().quantite_disponible, Decimal('0.00'))

    def test_ajustement_sets_absolute_value_not_delta(self):
        self.entree(qty='5')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'ajustement',
            'placement_destination': self.placement_a.id, 'quantite': '42',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(self.stock_at().quantite_disponible, Decimal('42.00'))

    def test_negative_quantite_rejected_at_field_level(self):
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'entree',
            'placement_destination': self.placement_a.id, 'quantite': '-1',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantite', resp.data)

    def test_zero_quantite_rejected_for_entree(self):
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'entree',
            'placement_destination': self.placement_a.id, 'quantite': '0',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantite', resp.data)


# ─── Bug #5 — real Stock unique constraints ────────────────────────────────────

class StockUniqueConstraintTests(StorageAPITestCase):
    def test_repeated_entree_same_location_accumulates_single_row(self):
        self.entree(qty='4')
        self.entree(qty='6')
        rows = Stock.objects.filter(article=self.article, placement=self.placement_a, lot=None)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().quantite_disponible, Decimal('10.00'))

    def test_unique_constraint_without_lot_enforced(self):
        Stock.objects.create(article=self.article, placement=self.placement_a, quantite_disponible=1)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Stock.objects.create(article=self.article, placement=self.placement_a, quantite_disponible=2)
        self.assertEqual(
            Stock.objects.filter(article=self.article, placement=self.placement_a, lot__isnull=True).count(), 1,
        )

    def test_unique_constraint_with_lot_enforced(self):
        lot = Lot.objects.create(article=self.article, numero_lot='L1')
        Stock.objects.create(article=self.article, placement=self.placement_a, lot=lot, quantite_disponible=1)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Stock.objects.create(article=self.article, placement=self.placement_a, lot=lot, quantite_disponible=2)
        self.assertEqual(
            Stock.objects.filter(article=self.article, placement=self.placement_a, lot=lot).count(), 1,
        )


# ─── Bug #8 / Feature #6 — lot expiration ──────────────────────────────────────

class LotExpirationTests(StorageAPITestCase):
    def test_expired_lot_flipped_to_perime_and_hidden_from_search(self):
        past = timezone.now().date() - timedelta(days=1)
        lot = Lot.objects.create(article=self.article, numero_lot='EXP1', date_peremption=past, statut='actif')
        resp = self.client.get(f'/api/storage/lots/search/?article={self.article.id}')
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn(lot.id, [r['id'] for r in resp.data])
        lot.refresh_from_db()
        self.assertEqual(lot.statut, 'perime')

    def test_active_future_lot_appears_in_search(self):
        future = timezone.now().date() + timedelta(days=10)
        lot = Lot.objects.create(article=self.article, numero_lot='OK1', date_peremption=future, statut='actif')
        resp = self.client.get(f'/api/storage/lots/search/?article={self.article.id}')
        self.assertIn(lot.id, [r['id'] for r in resp.data])

    def test_expire_lots_management_command(self):
        past = timezone.now().date() - timedelta(days=1)
        lot = Lot.objects.create(article=self.article, numero_lot='EXP2', date_peremption=past, statut='actif')
        call_command('expire_lots')
        lot.refresh_from_db()
        self.assertEqual(lot.statut, 'perime')


# ─── Article filtering: actif flag + search exclusion ──────────────────────────

class ArticleFilterTests(StorageAPITestCase):
    def test_actif_filter_on_article_list(self):
        inactive = Article.objects.create(code_article='INACT1', nom='Inactif', actif=False)

        resp = self.client.get('/api/storage/articles/?actif=non')
        codes = [a['code_article'] for a in resp.data['results']]
        self.assertIn(inactive.code_article, codes)
        self.assertNotIn(self.article.code_article, codes)

        resp = self.client.get('/api/storage/articles/?actif=oui')
        codes = [a['code_article'] for a in resp.data['results']]
        self.assertIn(self.article.code_article, codes)
        self.assertNotIn(inactive.code_article, codes)

        resp = self.client.get('/api/storage/articles/')
        codes = [a['code_article'] for a in resp.data['results']]
        self.assertIn(self.article.code_article, codes)
        self.assertIn(inactive.code_article, codes)

    def test_inactive_article_excluded_from_search_light(self):
        self.article.actif = False
        self.article.save(update_fields=['actif'])
        resp = self.client.get(f'/api/storage/articles/search/?q={self.article.code_article}')
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn(self.article.id, [r['id'] for r in resp.data])


# ─── Bug #11 — soft delete / hard-delete protection ────────────────────────────

class SoftDeleteProtectionTests(StorageAPITestCase):
    def test_article_without_history_can_be_hard_deleted(self):
        art = Article.objects.create(code_article='DEL1', nom='À supprimer')
        resp = self.client.delete(f'/api/storage/articles/{art.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Article.objects.filter(id=art.id).exists())

    def test_article_with_lot_cannot_be_deleted(self):
        Lot.objects.create(article=self.article, numero_lot='L1')
        resp = self.client.delete(f'/api/storage/articles/{self.article.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)
        self.assertTrue(Article.objects.filter(id=self.article.id).exists())

    def test_article_can_be_deactivated_instead_of_deleted(self):
        Lot.objects.create(article=self.article, numero_lot='L2')
        resp = self.client.patch(f'/api/storage/articles/{self.article.id}/', {'actif': False})
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.article.refresh_from_db()
        self.assertFalse(self.article.actif)

    def test_entrepot_with_stock_cannot_be_deleted(self):
        self.entree(qty='5')
        resp = self.client.delete(f'/api/storage/entrepots/{self.entrepot.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)

    def test_entrepot_with_movement_history_cannot_be_deleted(self):
        self.entree(qty='5')
        self.sortie('5')
        resp = self.client.delete(f'/api/storage/entrepots/{self.entrepot.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_placement_with_stock_cannot_be_deleted(self):
        self.entree(qty='5')
        resp = self.client.delete(f'/api/storage/placements/{self.placement_a.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)

    def test_empty_placement_can_be_deleted(self):
        resp = self.client.delete(f'/api/storage/placements/{self.placement_b.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)


# ─── Bug #10 — Ticket.code_barre_genere persisted ──────────────────────────────

class TicketTests(StorageAPITestCase):
    def test_ticket_stores_code_barre_genere(self):
        resp = self.client.post('/api/storage/tickets/', {
            'qr_contenu': 'PN:ART-001;QTY:5',
            'type_source': 'article',
            'article': self.article.id,
            'code_barre_genere': 'ART-001',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        ticket = Ticket.objects.get(id=resp.data['id'])
        self.assertEqual(ticket.code_barre_genere, 'ART-001')
        self.assertEqual(ticket.utilisateur_id, self.user.id)


# ─── Feature #1 — stock availability / quantité disponible réelle ─────────────

class StockAvailabilityTests(StorageAPITestCase):
    def test_quantite_disponible_reelle_accounts_for_reservation(self):
        self.entree(qty='10')
        stock = self.stock_at()
        resp = self.client.post(f'/api/storage/stocks/{stock.id}/reserve/', {'quantite': '4'})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(Decimal(str(resp.data['quantite_reservee'])), Decimal('4'))
        self.assertEqual(float(resp.data['quantiteDisponibleReelle']), 6.0)

    def test_sortie_blocked_when_exceeding_disponible(self):
        self.entree(qty='10')
        resp = self.sortie('15')
        self.assertEqual(resp.status_code, 400)


# ─── Feature #2 / #8 — resume (alerts, valuation, expiry counters) ─────────────

class StockResumeTests(StorageAPITestCase):
    def test_resume_fields_present_and_valuation_correct(self):
        self.entree(qty='2')  # below seuil_alerte=5 -> alert
        resp = self.client.get('/api/storage/stocks/resume/')
        self.assertEqual(resp.status_code, 200)
        for key in ('total_articles', 'total_alertes', 'lignes_stock', 'valeur_totale',
                    'total_reserve', 'lots_perimes', 'lots_proches'):
            self.assertIn(key, resp.data)
        self.assertGreaterEqual(resp.data['total_alertes'], 1)
        self.assertEqual(resp.data['valeur_totale'], 20.0)  # 2 * 10.00
        self.assertEqual(resp.data['lignes_stock'], 1)

    def test_resume_counts_reserved_quantity(self):
        self.entree(qty='10')
        stock = self.stock_at()
        self.client.post(f'/api/storage/stocks/{stock.id}/reserve/', {'quantite': '3'})
        resp = self.client.get('/api/storage/stocks/resume/')
        self.assertEqual(resp.data['total_reserve'], 3.0)

    def test_resume_counts_expiring_and_expired_lots(self):
        today = timezone.now().date()
        Lot.objects.create(article=self.article, numero_lot='SOON', date_peremption=today + timedelta(days=5), statut='actif')
        Lot.objects.create(article=self.article, numero_lot='OLD', date_peremption=today - timedelta(days=5), statut='perime')
        resp = self.client.get('/api/storage/stocks/resume/')
        self.assertGreaterEqual(resp.data['lots_proches'], 1)
        self.assertGreaterEqual(resp.data['lots_perimes'], 1)


# ─── Feature #3 — CSV import / export ──────────────────────────────────────────

class CsvImportExportTests(StorageAPITestCase):
    def test_articles_export_csv(self):
        resp = self.client.get('/api/storage/articles/export/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'text/csv; charset=utf-8-sig')
        content = resp.content.decode('utf-8-sig')
        self.assertIn('code_article', content)
        self.assertIn(self.article.code_article, content)

    def test_articles_import_csv(self):
        header = ['code_article', 'nom', 'description', 'categorie_code', 'unite_mesure',
                  'prix_unitaire', 'duree_vie_jours', 'seuil_alerte', 'qr_code', 'code_barre', 'actif']
        rows = [
            ['NEWART', 'Nouvel article', '', '', 'pcs', '5.5', '', '3', '', '', 'oui'],
            [self.article.code_article, 'Article renomme', '', self.categorie.code_categorie, 'pcs', '12', '', '5', '', '', 'oui'],
            ['BADCAT', 'Article cat invalide', '', 'NOPE', 'pcs', '1', '', '0', '', '', 'oui'],
        ]
        resp = self.client.post('/api/storage/articles/import/', {'file': csv_file(header, rows)}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['total'], 3)
        self.assertEqual(resp.data['success'], 2)
        self.assertEqual(len(resp.data['errors']), 1)
        self.assertEqual(resp.data['errors'][0]['row'], 4)
        self.assertTrue(Article.objects.filter(code_article='NEWART').exists())
        self.article.refresh_from_db()
        self.assertEqual(self.article.nom, 'Article renomme')

    def test_entrepots_export_import_csv(self):
        resp = self.client.get('/api/storage/entrepots/export/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.entrepot.code_entrepot, resp.content.decode('utf-8-sig'))

        header = ['code_entrepot', 'nom', 'adresse', 'ville', 'responsable', 'capacite_max', 'statut']
        rows = [
            ['ENT2', 'Entrepot 2', '', 'Paris', '', '100', 'actif'],
            ['ENT3', 'Entrepot bad statut', '', '', '', '', 'invalide'],
        ]
        resp = self.client.post('/api/storage/entrepots/import/', {'file': csv_file(header, rows)}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['success'], 1)
        self.assertEqual(len(resp.data['errors']), 1)
        self.assertTrue(Entrepot.objects.filter(code_entrepot='ENT2').exists())

    def test_placements_export_import_csv(self):
        resp = self.client.get('/api/storage/placements/export/')
        self.assertEqual(resp.status_code, 200)

        header = ['entrepot_code', 'code_emplacement', 'zone', 'allee', 'niveau', 'capacite_max', 'statut', 'qr_code']
        rows = [
            [self.entrepot.code_entrepot, 'B1', 'B', '', '', '50', 'disponible', ''],
            ['UNKNOWN', 'X1', '', '', '', '', 'disponible', ''],
        ]
        resp = self.client.post('/api/storage/placements/import/', {'file': csv_file(header, rows)}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['success'], 1)
        self.assertEqual(len(resp.data['errors']), 1)
        self.assertTrue(Placement.objects.filter(entrepot=self.entrepot, code_emplacement='B1').exists())

    def test_lots_export_import_csv(self):
        Lot.objects.create(article=self.article, numero_lot='EXIST1', quantite_initiale=Decimal('1'))
        resp = self.client.get('/api/storage/lots/export/')
        self.assertEqual(resp.status_code, 200)

        header = ['article_code', 'numero_lot', 'date_fabrication', 'date_peremption', 'quantite_initiale', 'statut', 'qr_code']
        rows = [
            [self.article.code_article, 'LOTNEW', '', '', '20', 'actif', ''],
            ['UNKNOWNART', 'LOTBAD', '', '', '5', 'actif', ''],
        ]
        resp = self.client.post('/api/storage/lots/import/', {'file': csv_file(header, rows)}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['success'], 1)
        self.assertEqual(len(resp.data['errors']), 1)
        self.assertTrue(Lot.objects.filter(article=self.article, numero_lot='LOTNEW').exists())

    def test_import_missing_required_columns(self):
        resp = self.client.post(
            '/api/storage/articles/import/',
            {'file': csv_file(['nom'], [['Sans code']])}, format='multipart',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_import_no_file(self):
        resp = self.client.post('/api/storage/articles/import/', {}, format='multipart')
        self.assertEqual(resp.status_code, 400)


# ─── Feature #5 — movement reversal ────────────────────────────────────────────

class MouvementReversalTests(StorageAPITestCase):
    def test_reverse_entree_creates_sortie_and_zeroes_stock(self):
        resp = self.entree(qty='10')
        resp2 = self.client.post(f"/api/storage/mouvements/{resp.data['id']}/reverse/")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED, resp2.data)
        self.assertEqual(resp2.data['type_mouvement'], 'sortie')
        self.assertEqual(self.stock_at().quantite_disponible, Decimal('0.00'))

    def test_reverse_sortie_creates_entree(self):
        self.entree(qty='10')
        resp = self.sortie('4')
        resp2 = self.client.post(f"/api/storage/mouvements/{resp.data['id']}/reverse/")
        self.assertEqual(resp2.status_code, 201, resp2.data)
        self.assertEqual(resp2.data['type_mouvement'], 'entree')
        self.assertEqual(self.stock_at().quantite_disponible, Decimal('10.00'))

    def test_reverse_transfert_swaps_placements(self):
        self.entree(qty='10')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'transfert',
            'placement_source': self.placement_a.id,
            'placement_destination': self.placement_b.id,
            'quantite': '6',
        })
        resp2 = self.client.post(f"/api/storage/mouvements/{resp.data['id']}/reverse/")
        self.assertEqual(resp2.status_code, 201, resp2.data)
        self.assertEqual(self.stock_at(self.placement_a).quantite_disponible, Decimal('10.00'))
        self.assertEqual(self.stock_at(self.placement_b).quantite_disponible, Decimal('0.00'))

    def test_reverse_ajustement_rejected(self):
        self.entree(qty='5')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'ajustement',
            'placement_destination': self.placement_a.id, 'quantite': '8',
        })
        resp2 = self.client.post(f"/api/storage/mouvements/{resp.data['id']}/reverse/")
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('error', resp2.data)

    def test_reverse_fails_if_stock_already_moved_away(self):
        resp = self.entree(qty='10')
        self.sortie('10')
        resp2 = self.client.post(f"/api/storage/mouvements/{resp.data['id']}/reverse/")
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('error', resp2.data)


# ─── Feature #7 — stock reservation / release ──────────────────────────────────

class StockReservationTests(StorageAPITestCase):
    def setUp(self):
        super().setUp()
        self.entree(qty='10')
        self.stock = self.stock_at()

    def test_reserve_within_available(self):
        resp = self.client.post(f'/api/storage/stocks/{self.stock.id}/reserve/', {'quantite': '4'})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_reservee, Decimal('4'))

    def test_reserve_exceeding_available_rejected(self):
        resp = self.client.post(f'/api/storage/stocks/{self.stock.id}/reserve/', {'quantite': '11'})
        self.assertEqual(resp.status_code, 400)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_reservee, Decimal('0'))

    def test_reserve_then_release(self):
        self.client.post(f'/api/storage/stocks/{self.stock.id}/reserve/', {'quantite': '4'})
        resp = self.client.post(f'/api/storage/stocks/{self.stock.id}/release/', {'quantite': '3'})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_reservee, Decimal('1'))

    def test_release_floors_at_zero(self):
        self.client.post(f'/api/storage/stocks/{self.stock.id}/reserve/', {'quantite': '2'})
        resp = self.client.post(f'/api/storage/stocks/{self.stock.id}/release/', {'quantite': '99'})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_reservee, Decimal('0'))

    def test_reserve_invalid_quantite_rejected(self):
        for bad in ('0', '-1', 'abc'):
            with self.subTest(bad=bad):
                resp = self.client.post(f'/api/storage/stocks/{self.stock.id}/reserve/', {'quantite': bad})
                self.assertEqual(resp.status_code, 400)


# ─── Feature #9 — placement capacity tracking ──────────────────────────────────

class PlacementCapacityTests(StorageAPITestCase):
    def test_placement_becomes_plein_at_capacity(self):
        self.placement_a.capacite_max = 10
        self.placement_a.save(update_fields=['capacite_max'])
        self.entree(qty='10')
        self.placement_a.refresh_from_db()
        self.assertEqual(self.placement_a.statut, 'plein')

    def test_placement_returns_to_disponible_below_capacity(self):
        self.placement_a.capacite_max = 10
        self.placement_a.save(update_fields=['capacite_max'])
        self.entree(qty='10')
        self.sortie('5')
        self.placement_a.refresh_from_db()
        self.assertEqual(self.placement_a.statut, 'disponible')

    def test_blocked_placement_status_not_overridden(self):
        self.placement_a.statut = 'bloque'
        self.placement_a.save(update_fields=['statut'])
        self.entree(qty='1')
        self.placement_a.refresh_from_db()
        self.assertEqual(self.placement_a.statut, 'bloque')


# ─── Feature #10 — self-transfer guard ─────────────────────────────────────────

class SelfTransferGuardTests(StorageAPITestCase):
    def test_transfert_to_same_placement_rejected(self):
        self.entree(qty='5')
        resp = self.client.post('/api/storage/mouvements/', {
            'article': self.article.id, 'type_mouvement': 'transfert',
            'placement_source': self.placement_a.id,
            'placement_destination': self.placement_a.id,
            'quantite': '1',
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn('placement_destination', resp.data)


# ─── General CRUD smoke tests ───────────────────────────────────────────────────

class BasicCrudSmokeTests(StorageAPITestCase):
    def test_categorie_crud(self):
        resp = self.client.post('/api/storage/categories/', {'code_categorie': 'CAT2', 'nom': 'Deuxieme categorie'})
        self.assertEqual(resp.status_code, 201, resp.data)
        cat_id = resp.data['id']
        resp = self.client.patch(f'/api/storage/categories/{cat_id}/', {'nom': 'Categorie modifiee'})
        self.assertEqual(resp.status_code, 200, resp.data)
        resp = self.client.delete(f'/api/storage/categories/{cat_id}/')
        self.assertEqual(resp.status_code, 204)

    def test_entrepot_crud(self):
        resp = self.client.post('/api/storage/entrepots/', {'code_entrepot': 'ENT2', 'nom': 'Entrepot 2'})
        self.assertEqual(resp.status_code, 201, resp.data)
        ent_id = resp.data['id']
        resp = self.client.patch(f'/api/storage/entrepots/{ent_id}/', {'ville': 'Lyon'})
        self.assertEqual(resp.status_code, 200, resp.data)
        resp = self.client.delete(f'/api/storage/entrepots/{ent_id}/')
        self.assertEqual(resp.status_code, 204)

    def test_placement_crud(self):
        resp = self.client.post('/api/storage/placements/', {
            'entrepot': self.entrepot.id, 'code_emplacement': 'C1',
        })
        self.assertEqual(resp.status_code, 201, resp.data)
        pl_id = resp.data['id']
        resp = self.client.patch(f'/api/storage/placements/{pl_id}/', {'zone': 'C'})
        self.assertEqual(resp.status_code, 200, resp.data)
        resp = self.client.delete(f'/api/storage/placements/{pl_id}/')
        self.assertEqual(resp.status_code, 204)

    def test_article_crud(self):
        resp = self.client.post('/api/storage/articles/', {
            'code_article': 'ART-002', 'nom': 'Deuxieme article', 'unite_mesure': 'kg', 'actif': True,
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data['actif'])
