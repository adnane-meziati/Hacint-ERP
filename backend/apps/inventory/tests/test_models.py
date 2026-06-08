from decimal import Decimal

import pytest

from apps.inventory.models import Item, Location, StockMovement, Warehouse


@pytest.fixture
def warehouse(db):
    return Warehouse.objects.create(code="WH-T1", name="Test Warehouse", is_active=True)


@pytest.fixture
def location(warehouse):
    return Location.objects.create(
        warehouse=warehouse,
        code="LOC-01",
        name="Zone A",
        location_type="rack",
        is_active=True,
    )


@pytest.fixture
def item(db):
    return Item.objects.create(
        sku="SKU-T01",
        name="Test Item",
        category="Wire",
        unit_of_measure="m",
        reorder_point=Decimal("100"),
        lead_time_days=3,
        unit_cost=Decimal("5.00"),
        is_active=True,
    )


class TestItem:
    def test_str(self, item):
        assert "SKU-T01" in str(item)

    def test_current_stock_empty(self, item):
        assert item.current_stock == Decimal("0")

    def test_current_stock_with_receipt(self, item, location, db):
        StockMovement.objects.create(
            item=item,
            to_location=location,
            qty=Decimal("200"),
            movement_type="receipt",
            reference="REC-001",
        )
        assert item.current_stock == Decimal("200")

    def test_current_stock_with_issue(self, item, location, db):
        StockMovement.objects.create(
            item=item,
            to_location=location,
            qty=Decimal("200"),
            movement_type="receipt",
            reference="REC-001",
        )
        StockMovement.objects.create(
            item=item,
            from_location=location,
            qty=Decimal("50"),
            movement_type="issue",
            reference="ISS-001",
        )
        assert item.current_stock == Decimal("150")

    def test_is_low_stock_false(self, item, location, db):
        StockMovement.objects.create(
            item=item,
            to_location=location,
            qty=Decimal("200"),
            movement_type="receipt",
            reference="REC-002",
        )
        assert item.is_low_stock is False

    def test_is_low_stock_true(self, item, db):
        assert item.is_low_stock is True


class TestWarehouse:
    def test_str(self, warehouse):
        assert "WH-T1" in str(warehouse)

    def test_location_created(self, location, warehouse):
        assert location.warehouse == warehouse
