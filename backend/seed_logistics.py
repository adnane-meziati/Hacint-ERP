#!/usr/bin/env python
"""
Seed script — données de démonstration pour le module Logistique.
Run with: python seed_logistics.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from hr.models import Employee
from storage.models import Article, Entrepot
from logistics.models import (
    Vehicle, Driver, DeliveryOrder, DeliveryOrderLine,
    Shipment, ShipmentLine, WarehouseTransfer, WarehouseTransferLine,
    LogisticsTask, LogisticsTaskComment, LogisticsTaskHistory,
    LogisticsNotification, LogisticsReport,
)

admin = User.objects.filter(is_superuser=True).first()
today = date.today()
art = lambda code: Article.objects.get(code_article=code)
ent = lambda code: Entrepot.objects.get(code_entrepot=code)

# ── 1. Véhicules ─────────────────────────────────────────────────────────
print("Véhicules...")
VEHICLES = [
    ('12345-A-7', 'Camion', '10 tonnes', 'available', date(2019, 3, 10), ''),
    ('45678-B-7', 'Camionnette', '1.5 tonnes', 'in_use', date(2021, 6, 1), ''),
    ('78912-A-7', 'Camion', '15 tonnes', 'maintenance', date(2017, 11, 20), 'Révision moteur en cours'),
    ('23456-C-7', 'Fourgon', '3.5 tonnes', 'available', date(2022, 1, 15), ''),
    ('99887-A-7', 'Voiture utilitaire', '500 kg', 'inactive', date(2014, 5, 5), 'Hors service — à réformer'),
]
vehicles = {}
for reg, vtype, capacity, status, service_date, notes in VEHICLES:
    v, _ = Vehicle.objects.get_or_create(
        registration=reg,
        defaults=dict(vehicle_type=vtype, capacity=capacity, status=status,
                       service_date=service_date, notes=notes),
    )
    vehicles[reg] = v
print(f"  {len(vehicles)} véhicules")

# ── 2. Chauffeurs (liés aux employés RH) ────────────────────────────────────
print("Chauffeurs...")
emp_5 = Employee.objects.get(employee_number='EMP-0005')
emp_6 = Employee.objects.get(employee_number='EMP-0006')
emp_7 = Employee.objects.get(employee_number='EMP-0007')
emp_12 = Employee.objects.get(employee_number='EMP-0012')

driver1, _ = Driver.objects.get_or_create(
    employee=emp_5,
    defaults=dict(license_number='C-123456-2014', license_expiry_date=date(2027, 3, 20), status='available'),
)
driver2, _ = Driver.objects.get_or_create(
    employee=emp_6,
    defaults=dict(license_number='C-789012-2019', license_expiry_date=date(2026, 9, 12), status='assigned'),
)
print(f"  {Driver.objects.count()} chauffeurs")

# ── 3. Commandes de livraison ───────────────────────────────────────────────
print("Commandes de livraison...")
DELIVERY_ORDERS = [
    ('DO-2026-001', today - timedelta(days=20), 'Aptiv Maroc SA',
     'Tanger Free Zone, Lot 14B, Tanger', 'delivered',
     [('ART-CON-001', 100)]),
    ('DO-2026-002', today - timedelta(days=5), 'Yazaki Morocco SA',
     'Zone Franche, Ilot 8, Tanger', 'shipped',
     [('ART-CON-005', 10), ('ART-CON-006', 10)]),
    ('DO-2026-003', today - timedelta(days=1), 'Lear Corporation Maroc',
     'Technopolis, Bât. C2, Rabat', 'preparation',
     [('ART-CAB-003', 200)]),
    ('DO-2026-004', today + timedelta(days=3), 'Renault Tanger Exploitation',
     'Zone Industrielle Melloussa, Tanger', 'pending',
     [('ART-CON-006', 20), ('ART-CAB-004', 100)]),
]
delivery_orders = {}
for num, ddate, customer, addr, status, lines in DELIVERY_ORDERS:
    do, created = DeliveryOrder.objects.get_or_create(
        delivery_number=num,
        defaults=dict(delivery_date=ddate, customer=customer, delivery_address=addr,
                       status=status, created_by=admin),
    )
    delivery_orders[num] = do
    if created:
        for art_code, qty in lines:
            DeliveryOrderLine.objects.create(
                delivery_order=do, article=art(art_code), quantity=Decimal(qty),
            )
print(f"  {DeliveryOrder.objects.count()} commandes ({DeliveryOrderLine.objects.count()} lignes)")

# ── 4. Expéditions ───────────────────────────────────────────────────────
print("Expéditions...")
drivers_by_emp = {'EMP-0005': driver1, 'EMP-0006': driver2}
SHIPMENTS = [
    ('EXP-2026-001', 'DO-2026-001', today - timedelta(days=18), '12345-A-7', 'EMP-0005', 'delivered',
     [('ART-CON-001', 100)]),
    ('EXP-2026-002', 'DO-2026-002', today - timedelta(days=3), '45678-B-7', 'EMP-0006', 'in_delivery',
     [('ART-CON-005', 10), ('ART-CON-006', 10)]),
    ('EXP-2026-003', 'DO-2026-003', today, None, None, 'preparation',
     [('ART-CAB-003', 200)]),
]
shipments = {}
for tracking, do_num, sdate, veh_reg, drv_emp, status, lines in SHIPMENTS:
    s, created = Shipment.objects.get_or_create(
        tracking_number=tracking,
        defaults=dict(
            delivery_order=delivery_orders[do_num], shipment_date=sdate,
            vehicle=vehicles[veh_reg] if veh_reg else None,
            driver=drivers_by_emp.get(drv_emp), status=status, created_by=admin,
        ),
    )
    shipments[tracking] = s
    if created:
        for art_code, qty in lines:
            ShipmentLine.objects.create(shipment=s, article=art(art_code), quantity=Decimal(qty))
print(f"  {Shipment.objects.count()} expéditions ({ShipmentLine.objects.count()} lignes)")

# ── 5. Transferts inter-entrepôts ────────────────────────────────────────────
print("Transferts...")
transfer1, created1 = WarehouseTransfer.objects.get_or_create(
    transfer_number='TRF-LOG-2026-001',
    defaults=dict(
        source_warehouse=ent('ENT-PRINC'), destination_warehouse=ent('ENT-SECON'),
        destination_type='warehouse', transport_type='own_vehicle',
        vehicle=vehicles['45678-B-7'], driver=driver2,
        requested_date=today - timedelta(days=7), status='received',
        requested_by=admin, approved_by=admin, approved_at=timezone.now() - timedelta(days=6),
        notes='Réapprovisionnement stock secondaire',
    ),
)
if created1:
    WarehouseTransferLine.objects.create(transfer=transfer1, article=art('ART-CON-001'), quantity=Decimal(50))

transfer2, created2 = WarehouseTransfer.objects.get_or_create(
    transfer_number='TRF-LOG-2026-002',
    defaults=dict(
        source_warehouse=ent('ENT-PRINC'), destination_type='external',
        external_destination='Chantier client Renault Melloussa',
        external_client='Renault Tanger Exploitation', external_site='Melloussa',
        transport_type='service', service_company='Trans Atlas SARL',
        service_contact='M. Bouzid', service_phone='0539-700000',
        requested_date=today - timedelta(days=2), status='in_transit',
        requested_by=admin, notes='Livraison matériel HT pour montage sur site',
    ),
)
if created2:
    WarehouseTransferLine.objects.create(transfer=transfer2, article=art('ART-CAB-004'), quantity=Decimal(100))

transfer3, created3 = WarehouseTransfer.objects.get_or_create(
    transfer_number='TRF-LOG-2026-003',
    defaults=dict(
        source_warehouse=ent('ENT-SECON'), destination_warehouse=ent('ENT-QUART'),
        destination_type='warehouse', transport_type='own_vehicle',
        requested_date=today, status='pending_approval',
        requested_by=admin, notes='Mise en quarantaine — lot proche expiration',
    ),
)
if created3:
    WarehouseTransferLine.objects.create(transfer=transfer3, article=art('ART-SEE-003'), quantity=Decimal(500))

print(f"  {WarehouseTransfer.objects.count()} transferts ({WarehouseTransferLine.objects.count()} lignes)")

# ── 6. Tâches logistiques ───────────────────────────────────────────────────
print("Tâches...")
TASKS = [
    ('Préparer commande Yazaki EXP-2026-002', 'high', today - timedelta(days=4), 'done',
     [emp_6], 'order_preparer', delivery_orders['DO-2026-002'], None, None,
     'Préparation et conditionnement avant expédition.'),
    ('Livrer commande Aptiv (DO-2026-001)', 'medium', today - timedelta(days=18), 'done',
     [emp_5], 'driver', None, shipments['EXP-2026-001'], None,
     'Livraison effectuée sans incident.'),
    ('Transfert stock vers entrepôt secondaire', 'medium', today - timedelta(days=6), 'done',
     [emp_7, emp_6], 'warehouse_operator', None, None, transfer1,
     'Chargement et déchargement du transfert TRF-LOG-2026-001.'),
    ('Contrôle technique véhicule avant départ', 'low', today + timedelta(days=2), 'todo',
     [emp_5], 'driver', None, None, None,
     'Vérifier niveaux, pneus, freins avant la prochaine tournée.'),
    ('Coordination expédition Yazaki', 'high', today + timedelta(days=1), 'in_progress',
     [emp_12], 'shipping_coordinator', None, shipments['EXP-2026-002'], None,
     'Suivre la livraison en cours et confirmer réception client.'),
    ('Livraison chantier Renault Melloussa', 'critical', today + timedelta(days=1), 'in_progress',
     [emp_12, emp_6], 'other', None, None, transfer2,
     'Coordination avec le transporteur externe Trans Atlas.'),
]
tasks = {}
for title, priority, due, status, assignees, role, do, shp, trf, desc in TASKS:
    extra_role = {'other_role_description': 'Coordination transport externe'} if role == 'other' else {}
    task, created = LogisticsTask.objects.get_or_create(
        title=title,
        defaults=dict(
            description=desc, priority=priority, due_date=due, status=status,
            assigned_role=role, delivery_order=do, shipment=shp, transfer=trf,
            created_by=admin, **extra_role,
        ),
    )
    if created:
        task.assigned_employees.set(assignees)
    tasks[title] = task
print(f"  {LogisticsTask.objects.count()} tâches")

# ── 7. Commentaires & historique ────────────────────────────────────────────
print("Commentaires & historique...")
t1 = tasks['Préparer commande Yazaki EXP-2026-002']
LogisticsTaskComment.objects.get_or_create(
    task=t1, author=admin,
    comment='Colis prêts, en attente du chauffeur pour chargement.',
)
LogisticsTaskHistory.objects.get_or_create(
    task=t1, actor=admin, action='status_change',
    old_value='in_progress', new_value='done',
)
print(f"  {LogisticsTaskComment.objects.count()} commentaires, {LogisticsTaskHistory.objects.count()} historique")

# ── 8. Notifications ─────────────────────────────────────────────────────────
print("Notifications...")
NOTIFICATIONS = [
    (emp_6, tasks['Préparer commande Yazaki EXP-2026-002'], 'assignment',
     'Nouvelle tâche assignée',
     "Vous avez été assigné(e) à la tâche « Préparer commande Yazaki EXP-2026-002 ».", True),
    (emp_5, tasks['Livrer commande Aptiv (DO-2026-001)'], 'completed',
     'Tâche terminée',
     "La tâche « Livrer commande Aptiv (DO-2026-001) » a été marquée comme terminée.", True),
    (emp_5, tasks['Contrôle technique véhicule avant départ'], 'deadline',
     'Échéance proche',
     "La tâche « Contrôle technique véhicule avant départ » arrive à échéance dans 2 jours.", False),
    (emp_12, tasks['Coordination expédition Yazaki'], 'assignment',
     'Nouvelle tâche assignée',
     "Vous avez été assigné(e) à la tâche « Coordination expédition Yazaki ».", False),
]
for employee, task, ntype, title, message, is_read in NOTIFICATIONS:
    extra = {'read_at': timezone.now() - timedelta(hours=2)} if is_read else {}
    LogisticsNotification.objects.get_or_create(
        recipient=admin, employee=employee, task=task, notification_type=ntype, title=title,
        defaults=dict(message=message, is_read=is_read, **extra),
    )
print(f"  {LogisticsNotification.objects.count()} notifications")

# ── 9. Rapports ─────────────────────────────────────────────────────────────
print("Rapports...")
REPORTS = [
    ('Rapport mensuel livraisons — Mai 2026', 'delivery', today - timedelta(days=10),
     "12 commandes livrées dans les délais sur 14 (taux de service 86%). "
     "2 retards liés à la disponibilité des chauffeurs."),
    ('Incident — retard chargement EXP-2026-002', 'incident', today - timedelta(days=3),
     "Retard de 2h au chargement chez Yazaki en raison d'une indisponibilité de quai. "
     "Client informé, livraison reprogrammée."),
    ('Rapport transfert inter-entrepôts — Juin 2026', 'transfer', today - timedelta(days=1),
     "Transfert TRF-LOG-2026-001 réalisé sans incident vers le stock secondaire. "
     "Transfert TRF-LOG-2026-002 en cours vers le chantier Renault Melloussa."),
]
for title, rtype, rdate, content in REPORTS:
    LogisticsReport.objects.get_or_create(
        title=title, report_type=rtype,
        defaults=dict(report_date=rdate, content=content, created_by=admin),
    )
print(f"  {LogisticsReport.objects.count()} rapports")

# ── Résumé ────────────────────────────────────────────────────────────────────
print()
print("=== Données Logistique chargées ===")
print(f"  Véhicules    : {Vehicle.objects.count()}")
print(f"  Chauffeurs   : {Driver.objects.count()}")
print(f"  Livraisons   : {DeliveryOrder.objects.count()} ({DeliveryOrderLine.objects.count()} lignes)")
print(f"  Expéditions  : {Shipment.objects.count()} ({ShipmentLine.objects.count()} lignes)")
print(f"  Transferts   : {WarehouseTransfer.objects.count()} ({WarehouseTransferLine.objects.count()} lignes)")
print(f"  Tâches       : {LogisticsTask.objects.count()}")
print(f"  Commentaires : {LogisticsTaskComment.objects.count()}")
print(f"  Historique   : {LogisticsTaskHistory.objects.count()}")
print(f"  Notifications: {LogisticsNotification.objects.count()}")
print(f"  Rapports     : {LogisticsReport.objects.count()}")
