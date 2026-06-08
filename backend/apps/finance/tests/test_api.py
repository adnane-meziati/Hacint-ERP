import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.finance.models import Account, Invoice
from apps.sales.models import Customer


@pytest.fixture
def admin(db):
    return User.objects.create_user(username="fin_admin", password="pw", role=Role.ADMIN)


@pytest.fixture
def auth_client(admin):
    c = APIClient()
    c.force_authenticate(user=admin)
    return c


@pytest.fixture
def customer(db):
    return Customer.objects.create(code="FIN-API-C1", name="Finance API Customer", country="MA", status="active")


@pytest.fixture
def invoice(customer, db):
    return Invoice.objects.create(
        ref="INV-API-001",
        invoice_type="customer",
        customer=customer,
        issue_date=datetime.date.today(),
        due_date=datetime.date.today() + datetime.timedelta(days=30),
        status="draft",
        currency="MAD",
        total_amount=Decimal("50000"),
        paid_amount=Decimal("0"),
    )


class TestInvoiceAPI:
    def test_list(self, auth_client, invoice):
        res = auth_client.get("/api/v1/finance/invoices/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_retrieve_has_computed_fields(self, auth_client, invoice):
        res = auth_client.get(f"/api/v1/finance/invoices/{invoice.id}/")
        assert res.status_code == 200
        assert "outstanding_amount" in res.data
        assert "is_overdue" in res.data
        assert "customer_name" in res.data

    def test_filter_by_status(self, auth_client, invoice):
        res = auth_client.get("/api/v1/finance/invoices/?status=draft")
        assert res.status_code == 200
        for item in res.data["results"]:
            assert item["status"] == "draft"

    def test_filter_by_type(self, auth_client, invoice):
        res = auth_client.get("/api/v1/finance/invoices/?invoice_type=customer")
        assert res.status_code == 200
        for item in res.data["results"]:
            assert item["invoice_type"] == "customer"


class TestAccountAPI:
    def test_list(self, auth_client, db):
        Account.objects.create(code="411001", name="Clients test", account_type="asset", currency="MAD")
        res = auth_client.get("/api/v1/finance/accounts/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_create(self, auth_client, db):
        res = auth_client.post("/api/v1/finance/accounts/", {
            "code": "512001",
            "name": "CIH Bank",
            "account_type": "asset",
            "currency": "MAD",
        })
        assert res.status_code == 201
