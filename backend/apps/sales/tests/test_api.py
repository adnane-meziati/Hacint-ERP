import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.sales.models import Customer, SalesOrder


@pytest.fixture
def admin(db):
    return User.objects.create_user(username="sales_admin", password="pw", role=Role.ADMIN)


@pytest.fixture
def viewer(db):
    return User.objects.create_user(username="sales_viewer", password="pw", role=Role.CLIENT)


@pytest.fixture
def auth_client(admin):
    c = APIClient()
    c.force_authenticate(user=admin)
    return c


@pytest.fixture
def viewer_client(viewer):
    c = APIClient()
    c.force_authenticate(user=viewer)
    return c


@pytest.fixture
def customer(db):
    return Customer.objects.create(
        code="CUST-API",
        name="API Customer",
        country="MA",
        status="active",
    )


class TestCustomerAPI:
    def test_list(self, auth_client, customer):
        res = auth_client.get("/api/v1/sales/customers/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_create(self, auth_client, db):
        res = auth_client.post("/api/v1/sales/customers/", {
            "code": "CUST-NEW",
            "name": "New Customer",
            "country": "MA",
            "status": "active",
        })
        assert res.status_code == 201
        assert res.data["code"] == "CUST-NEW"

    def test_requires_auth(self, db, customer):
        c = APIClient()
        res = c.get("/api/v1/sales/customers/")
        assert res.status_code == 401


class TestSalesOrderAPI:
    def test_list(self, auth_client, customer, db):
        SalesOrder.objects.create(
            ref="SO-API-001",
            customer=customer,
            delivery_date=datetime.date(2026, 12, 31),
            status="confirmed",
            currency="MAD",
            total_amount=Decimal("10000"),
        )
        res = auth_client.get("/api/v1/sales/orders/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_filter_by_status(self, auth_client, customer, db):
        SalesOrder.objects.create(
            ref="SO-DRAFT-001",
            customer=customer,
            delivery_date=datetime.date(2026, 12, 31),
            status="draft",
            currency="MAD",
            total_amount=Decimal("0"),
        )
        res = auth_client.get("/api/v1/sales/orders/?status=draft")
        assert res.status_code == 200
        for item in res.data["results"]:
            assert item["status"] == "draft"

    def test_search(self, auth_client, customer, db):
        SalesOrder.objects.create(
            ref="SO-SEARCH-001",
            customer=customer,
            delivery_date=datetime.date(2026, 12, 31),
            status="confirmed",
            currency="MAD",
            total_amount=Decimal("0"),
        )
        res = auth_client.get("/api/v1/sales/orders/?search=SEARCH")
        assert res.status_code == 200
        refs = [o["ref"] for o in res.data["results"]]
        assert "SO-SEARCH-001" in refs
