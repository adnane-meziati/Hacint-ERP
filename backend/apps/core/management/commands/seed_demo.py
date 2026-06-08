"""
Idempotent demo data seeder.
Run:  python manage.py seed_demo
Creates users, clients, families, stages, and all ERP module data.
Safe to re-run — uses get_or_create throughout.
"""

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.catalog.models import Article, Client, Family
from apps.finance.models import Account, Invoice, InvoiceLine, Payment
from apps.hr.models import Department, Employee, PayrollRecord
from apps.inventory.models import Item, Location, StockMovement, Warehouse
from apps.plm.models import BillOfMaterials, BOMLine
from apps.production.models import ManufacturingOrder, Stage, WorkCenter
from apps.purchase.models import PurchaseOrder, PurchaseOrderLine, Vendor
from apps.quality.models import Audit, CAPA, Inspection, InspectionLine, NonConformity
from apps.reporting.models import SavedReport
from apps.sales.models import Customer, SalesOrder, SalesOrderLine


USERS = [
    {"username": "admin",      "password": "Admin1234!",  "role": Role.ADMIN,       "email": "admin@megaindus.ma",      "first_name": "Admin"},
    {"username": "planner",    "password": "Plan1234!",   "role": Role.PLANNER,     "email": "planner@megaindus.ma",    "first_name": "Planner"},
    {"username": "designer",   "password": "Dsgn1234!",   "role": Role.DESIGNER,    "email": "designer@megaindus.ma",   "first_name": "Designer"},
    {"username": "programmer", "password": "Prog1234!",   "role": Role.PROGRAMMER,  "email": "programmer@megaindus.ma", "first_name": "Programmer"},
    {"username": "operator",   "password": "Oper1234!",   "role": Role.OPERATOR,    "email": "operator@megaindus.ma",   "first_name": "Operator"},
    {"username": "assembly",   "password": "Assy1234!",   "role": Role.ASSEMBLY,    "email": "assembly@megaindus.ma",   "first_name": "Assembly"},
    {"username": "qc",         "password": "Qual1234!",   "role": Role.QC,          "email": "qc@megaindus.ma",         "first_name": "Quality"},
    {"username": "client",     "password": "Clie1234!",   "role": Role.CLIENT,      "email": "client@aptiv.com",        "first_name": "Client"},
]

CLIENTS = [
    ("APTIV", "APTIV Morocco", "MA", "contact@aptiv.ma"),
]

FAMILIES = [
    ("KIT",     "Kit"),
    ("MAIN",    "Main"),
    ("PLANCIA", "Plancia"),
    ("PORTA",   "Porta"),
    ("EDM",     "EDM"),
    ("F169",    "F169"),
]

STAGES = [
    ("ECH", "Échantillon",    1),
    ("CAD", "Dessin (CAD)",   2),
    ("CAM", "CAM",            3),
    ("CNC", "CNC",            4),
    ("MTG", "Montage",        5),
    ("QF",  "Qualité finale", 6),
    ("AQC", "APTIV QC",       7),
]

DEMO_ARTICLES = [
    ("ART-001", "Support boîte à gants", "KIT"),
    ("ART-002", "Planche de bord complète", "PLANCIA"),
    ("ART-003", "Panneau de porte gauche", "PORTA"),
    ("ART-004", "Console centrale", "MAIN"),
]

SALES_CUSTOMERS = [
    ("APTIV-EMEA", "Aptiv EMEA", "BE", "procurement@aptiv.com", Decimal("5000000"), "MAD"),
    ("YAZAKI-MA",  "Yazaki Morocco", "MA", "supply@yazaki.ma",  Decimal("3000000"), "MAD"),
    ("LEAR-MA",    "Lear Corporation", "MA", "orders@lear.com", Decimal("2000000"), "MAD"),
    ("RENAULT-TNG","Renault Tanger",   "MA", "fournisseurs@renault.ma", Decimal("4000000"), "MAD"),
]

VENDORS = [
    ("HACINT-MA",  "HACINT Morocco",     "MA", "ventes@hacint.ma",     "30 jours net", "MAD"),
    ("ITA-MA",     "IT All Services",    "MA", "contact@ita.ma",       "15 jours net", "MAD"),
    ("TOPSOLID-FR","TopSolid",           "FR", "sales@topsolid.com",   "60 jours net", "EUR"),
]

WORK_CENTERS = [
    ("TX500",  "Tornos TX500 CNC",      Decimal("4.0"),  15),
    ("T600S",  "Tsugami T-600S CNC",    Decimal("3.5"),  20),
    ("HB400C", "DMG HB400C CNC",        Decimal("5.0"),  10),
]

INVENTORY_ITEMS = [
    ("WR-035-RD", "Wire 0.35mm² Red",      "Wire",      "m",   Decimal("500"),  5, Decimal("2.50")),
    ("WR-035-BK", "Wire 0.35mm² Black",    "Wire",      "m",   Decimal("500"),  5, Decimal("2.50")),
    ("CN-2P-F",   "Connector 2-pin Female","Connector", "pce", Decimal("200"),  2, Decimal("12.00")),
    ("CN-6P-F",   "Connector 6-pin Female","Connector", "pce", Decimal("100"),  2, Decimal("28.50")),
    ("TP-PVC-19", "Tape PVC 19mm",         "Consumable","roll",Decimal("50"),   3, Decimal("18.00")),
    ("TM-CRIMP",  "Terminal crimped 0.35", "Terminal",  "pce", Decimal("1000"), 5, Decimal("0.85")),
]

DEPARTMENTS = [
    ("PROD", "Production"),
    ("QC",   "Qualité"),
    ("ENG",  "Engineering"),
    ("HR",   "Ressources Humaines"),
    ("FIN",  "Finance"),
]

EMPLOYEES_DATA = [
    ("EMP-001", "Youssef",   "Benali",    "PROD", "Chef d'atelier",       "2021-03-15", "full_time", "active",  Decimal("18500")),
    ("EMP-002", "Fatima",    "Ouali",     "QC",   "Contrôleur qualité",   "2020-06-01", "full_time", "active",  Decimal("16000")),
    ("EMP-003", "Hassan",    "Mrabti",    "ENG",  "Ingénieur PLM",        "2019-09-10", "full_time", "active",  Decimal("22000")),
    ("EMP-004", "Amina",     "Tazi",      "HR",   "RH Généraliste",       "2022-01-20", "full_time", "active",  Decimal("15000")),
    ("EMP-005", "Mohammed",  "Filali",    "FIN",  "Comptable",            "2020-11-05", "full_time", "active",  Decimal("17500")),
]

ACCOUNTS = [
    ("411000", "Clients",           "asset",    "MAD"),
    ("401000", "Fournisseurs",      "liability","MAD"),
    ("701000", "Ventes produits",   "revenue",  "MAD"),
    ("601000", "Achats matières",   "expense",  "MAD"),
    ("512000", "Banque CIH",        "asset",    "MAD"),
    ("101000", "Capital social",    "equity",   "MAD"),
]

SAVED_REPORTS = [
    ("Commandes du mois",   "Commandes confirmées sur le mois en cours", "sales"),
    ("Stock critique",      "Articles sous seuil de réapprovisionnement","inventory"),
    ("Factures impayées",   "Factures client dont l'échéance est passée", "finance"),
    ("Productivité ateliers","Output journalier par centre de travail",   "production"),
]


class Command(BaseCommand):
    help = "Seed demo users, clients, families, stages, and all ERP module data (idempotent)."

    def handle(self, *args: object, **options: object) -> None:
        self._seed_users()
        self._seed_clients()
        self._seed_families()
        self._seed_stages()
        self._seed_articles()
        self._seed_sales_customers()
        self._seed_vendors()
        self._seed_work_centers()
        self._seed_inventory()
        self._seed_departments()
        self._seed_employees()
        self._seed_accounts()
        self._seed_sales_orders()
        self._seed_purchase_orders()
        self._seed_inspections()
        self._seed_invoices()
        self._seed_saved_reports()
        self.stdout.write(self.style.SUCCESS("✓ Seed complete."))

    # ── Existing ──────────────────────────────────────────────────────────────

    def _seed_users(self) -> None:
        created = 0
        for data in USERS:
            user, is_new = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data["email"],
                    "first_name": data["first_name"],
                    "role": data["role"],
                    "is_staff": data["role"] == Role.ADMIN,
                    "is_superuser": data["role"] == Role.ADMIN,
                },
            )
            if is_new:
                user.set_password(data["password"])
                user.save(update_fields=["password"])
                created += 1
        self.stdout.write(f"  Users: {created} created, {len(USERS) - created} already existed.")

    def _seed_clients(self) -> None:
        created = 0
        for code, name, country, email in CLIENTS:
            _, is_new = Client.objects.get_or_create(
                code=code,
                defaults={"name": name, "country": country, "contact_email": email},
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Clients: {created} created.")

    def _seed_families(self) -> None:
        created = 0
        for code, name in FAMILIES:
            _, is_new = Family.objects.get_or_create(code=code, defaults={"name": name})
            if is_new:
                created += 1
        self.stdout.write(f"  Families: {created} created.")

    def _seed_stages(self) -> None:
        created = 0
        for code, name, seq in STAGES:
            _, is_new = Stage.objects.get_or_create(
                code=code, defaults={"name": name, "sequence": seq, "is_active": True}
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Stages: {created} created.")

    def _seed_articles(self) -> None:
        created = 0
        for ref, desc, family_code in DEMO_ARTICLES:
            family = Family.objects.get(code=family_code)
            _, is_new = Article.objects.get_or_create(
                ref_client=ref,
                defaults={"description": desc, "family": family},
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Articles: {created} created.")

    # ── ERP modules ───────────────────────────────────────────────────────────

    def _seed_sales_customers(self) -> None:
        created = 0
        for code, name, country, email, credit_limit, currency in SALES_CUSTOMERS:
            _, is_new = Customer.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "country": country,
                    "contact_email": email,
                    "credit_limit": credit_limit,
                    "currency": currency,
                    "status": "active",
                },
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Sales customers: {created} created.")

    def _seed_vendors(self) -> None:
        created = 0
        for code, name, country, email, terms, currency in VENDORS:
            _, is_new = Vendor.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "country": country,
                    "contact_email": email,
                    "payment_terms": terms,
                    "currency": currency,
                    "status": "active",
                },
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Vendors: {created} created.")

    def _seed_work_centers(self) -> None:
        created = 0
        for code, name, capacity, setup in WORK_CENTERS:
            _, is_new = WorkCenter.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "capacity_per_hour": capacity,
                    "setup_time_minutes": setup,
                    "is_active": True,
                },
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Work centers: {created} created.")

    def _seed_inventory(self) -> None:
        wh, _ = Warehouse.objects.get_or_create(
            code="WH-TNG",
            defaults={"name": "Entrepôt Tanger", "address": "TAC2 Tanger Automotive City", "is_active": True},
        )
        loc, _ = Location.objects.get_or_create(
            warehouse=wh,
            code="MAIN-01",
            defaults={"name": "Zone principale", "location_type": "floor", "is_active": True},
        )
        created = 0
        for sku, name, category, uom, reorder, lead_time, cost in INVENTORY_ITEMS:
            item, is_new = Item.objects.get_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "category": category,
                    "unit_of_measure": uom,
                    "reorder_point": reorder,
                    "lead_time_days": lead_time,
                    "unit_cost": cost,
                    "is_active": True,
                },
            )
            if is_new:
                created += 1
                StockMovement.objects.create(
                    item=item,
                    to_location=loc,
                    qty=reorder * 3,
                    movement_type="receipt",
                    reference=f"INIT-{sku}",
                    notes="Initial stock seeding",
                )
        self.stdout.write(f"  Inventory items: {created} created.")

    def _seed_departments(self) -> None:
        created = 0
        for code, name in DEPARTMENTS:
            _, is_new = Department.objects.get_or_create(
                code=code,
                defaults={"name": name},
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Departments: {created} created.")

    def _seed_employees(self) -> None:
        created = 0
        for emp_code, first, last, dept_code, title, hire_date, emp_type, emp_status, salary in EMPLOYEES_DATA:
            dept = Department.objects.get(code=dept_code)
            _, is_new = Employee.objects.get_or_create(
                emp_code=emp_code,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "department": dept,
                    "job_title": title,
                    "hire_date": datetime.date.fromisoformat(hire_date),
                    "employment_type": emp_type,
                    "status": emp_status,
                    "salary_base": salary,
                    "currency": "MAD",
                },
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Employees: {created} created.")

    def _seed_accounts(self) -> None:
        created = 0
        for code, name, acc_type, currency in ACCOUNTS:
            _, is_new = Account.objects.get_or_create(
                code=code,
                defaults={"name": name, "account_type": acc_type, "currency": currency, "is_active": True},
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Accounts: {created} created.")

    def _seed_sales_orders(self) -> None:
        today = datetime.date.today()
        customer = Customer.objects.filter(code="APTIV-EMEA").first()
        if not customer:
            return
        order, is_new = SalesOrder.objects.get_or_create(
            ref="SO-2025-001",
            defaults={
                "customer": customer,
                "delivery_date": today + datetime.timedelta(days=30),
                "status": "confirmed",
                "currency": "MAD",
                "total_amount": Decimal("125000.00"),
            },
        )
        if is_new:
            SalesOrderLine.objects.create(
                order=order,
                item_sku="CN-6P-F",
                description="Connector 6-pin Female assemblée",
                qty=Decimal("5000"),
                unit_price=Decimal("25.00"),
                line_total=Decimal("125000.00"),
            )
            self.stdout.write("  Sales orders: 1 created.")
        else:
            self.stdout.write("  Sales orders: already existed.")

        # Create a manufacturing order for this sales order line
        line = SalesOrderLine.objects.filter(order=order).first()
        wc = WorkCenter.objects.filter(code="HB400C").first()
        if line and wc:
            ManufacturingOrder.objects.get_or_create(
                ref="MO-2025-001",
                defaults={
                    "sales_order_line": line,
                    "work_center": wc,
                    "planned_start": today,
                    "planned_end": today + datetime.timedelta(days=20),
                    "qty_planned": Decimal("5000"),
                    "qty_produced": Decimal("1200"),
                    "status": "in_progress",
                },
            )

    def _seed_purchase_orders(self) -> None:
        today = datetime.date.today()
        vendor = Vendor.objects.filter(code="HACINT-MA").first()
        if not vendor:
            return
        po, is_new = PurchaseOrder.objects.get_or_create(
            ref="PO-2025-001",
            defaults={
                "vendor": vendor,
                "expected_date": today + datetime.timedelta(days=14),
                "status": "confirmed",
                "currency": "MAD",
                "total_amount": Decimal("45000.00"),
            },
        )
        if is_new:
            PurchaseOrderLine.objects.create(
                purchase_order=po,
                item_sku="WR-035-RD",
                description="Câble 0.35mm² rouge",
                qty=Decimal("10000"),
                unit_price=Decimal("2.50"),
                line_total=Decimal("25000.00"),
            )
            PurchaseOrderLine.objects.create(
                purchase_order=po,
                item_sku="WR-035-BK",
                description="Câble 0.35mm² noir",
                qty=Decimal("8000"),
                unit_price=Decimal("2.50"),
                line_total=Decimal("20000.00"),
            )
            self.stdout.write("  Purchase orders: 1 created.")
        else:
            self.stdout.write("  Purchase orders: already existed.")

    def _seed_inspections(self) -> None:
        today = datetime.date.today()
        qc_user = User.objects.filter(username="qc").first()
        if not qc_user:
            return
        inspection, is_new = Inspection.objects.get_or_create(
            ref="QC-2025-001",
            defaults={
                "sales_order_ref": "SO-2025-001",
                "inspector": qc_user,
                "status": "passed",
                "inspection_date": today - datetime.timedelta(days=3),
            },
        )
        if is_new:
            InspectionLine.objects.create(
                inspection=inspection,
                checkpoint="Dimensions conformes",
                result="pass",
                remarks="Toutes dimensions dans tolérance ±0.05mm",
            )
            InspectionLine.objects.create(
                inspection=inspection,
                checkpoint="Marquage et traçabilité",
                result="pass",
            )
            InspectionLine.objects.create(
                inspection=inspection,
                checkpoint="Aspect visuel surface",
                result="pass",
            )
            self.stdout.write("  Inspections: 1 created.")
        else:
            self.stdout.write("  Inspections: already existed.")

        # Audit sample
        admin_user = User.objects.filter(username="admin").first()
        if admin_user:
            Audit.objects.get_or_create(
                ref="AUD-2025-001",
                defaults={
                    "audit_type": "internal",
                    "scope": "Processus fabrication filerie",
                    "auditor": "Bureau Veritas",
                    "planned_date": today + datetime.timedelta(days=60),
                    "status": "planned",
                },
            )

    def _seed_invoices(self) -> None:
        today = datetime.date.today()
        customer = Customer.objects.filter(code="APTIV-EMEA").first()
        if not customer:
            return
        invoice, is_new = Invoice.objects.get_or_create(
            ref="INV-2025-001",
            defaults={
                "invoice_type": "customer",
                "customer": customer,
                "issue_date": today - datetime.timedelta(days=15),
                "due_date": today + datetime.timedelta(days=15),
                "status": "sent",
                "currency": "MAD",
                "total_amount": Decimal("125000.00"),
                "paid_amount": Decimal("0.00"),
            },
        )
        if is_new:
            InvoiceLine.objects.create(
                invoice=invoice,
                description="Connector 6-pin Female assemblée — SO-2025-001",
                qty=Decimal("5000"),
                unit_price=Decimal("22.32"),
                tax_rate=Decimal("20"),
                line_total=Decimal("125000.00"),
            )
            self.stdout.write("  Invoices: 1 created.")
        else:
            self.stdout.write("  Invoices: already existed.")

    def _seed_saved_reports(self) -> None:
        admin_user = User.objects.filter(username="admin").first()
        created = 0
        for name, description, module in SAVED_REPORTS:
            _, is_new = SavedReport.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "module": module,
                    "query_params": {},
                    "is_public": True,
                    "created_by": admin_user,
                },
            )
            if is_new:
                created += 1
        self.stdout.write(f"  Saved reports: {created} created.")
