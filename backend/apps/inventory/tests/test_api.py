from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.inventory.models import Item, Warehouse


@pytest.fixture
def admin(db):
    return User.objects.create_user(username="inv_admin", password="pw", role=Role.ADMIN)


@pytest.fixture
def auth_client(admin):
    c = APIClient()
    c.force_authenticate(user=admin)
    return c


@pytest.fixture
def item(db):
    return Item.objects.create(
        sku="SKU-API-01",
        name="API Test Item",
        category="Wire",
        unit_of_measure="m",
        reorder_point=Decimal("100"),
        is_active=True,
    )


class TestItemAPI:
    def test_list(self, auth_client, item):
        res = auth_client.get("/api/v1/inventory/items/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_item_has_current_stock_field(self, auth_client, item):
        res = auth_client.get(f"/api/v1/inventory/items/{item.id}/")
        assert res.status_code == 200
        assert "current_stock" in res.data
        assert "is_low_stock" in res.data

    def test_filter_by_category(self, auth_client, item, db):
        Item.objects.create(sku="SKU-API-02", name="Connector", category="Connector", unit_of_measure="pce", reorder_point=50)
        res = auth_client.get("/api/v1/inventory/items/?category=Wire")
        assert res.status_code == 200
        for i in res.data["results"]:
            assert i["category"] == "Wire"

    def test_search_by_sku(self, auth_client, item):
        res = auth_client.get("/api/v1/inventory/items/?search=SKU-API-01")
        assert res.status_code == 200
        skus = [i["sku"] for i in res.data["results"]]
        assert "SKU-API-01" in skus

    def test_unauthenticated_denied(self, item):
        c = APIClient()
        res = c.get("/api/v1/inventory/items/")
        assert res.status_code == 401


class TestWarehouseAPI:
    def test_list(self, auth_client, db):
        Warehouse.objects.create(code="WH-API-01", name="Test WH")
        res = auth_client.get("/api/v1/inventory/warehouses/")
        assert res.status_code == 200
        assert res.data["count"] >= 1
