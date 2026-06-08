import pytest
from decimal import Decimal

from apps.accounts.models import Role, User
from apps.sales.models import Customer, Quote, SalesOrder, SalesOrderLine


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username="admin_s", password="pw", role=Role.ADMIN)


@pytest.fixture
def customer(db):
    return Customer.objects.create(
        code="CUST-T1",
        name="Test Customer",
        country="MA",
        credit_limit=Decimal("100000"),
        currency="MAD",
        status="active",
    )


class TestCustomer:
    def test_str(self, customer):
        assert "Test Customer" in str(customer)

    def test_ordering(self, customer, db):
        c2 = Customer.objects.create(code="CUST-A1", name="A Customer", country="MA")
        customers = list(Customer.objects.all())
        assert customers[0].code < customers[-1].code or customers[0].name <= customers[-1].name


class TestSalesOrder:
    def test_create(self, customer, db):
        import datetime
        order = SalesOrder.objects.create(
            ref="SO-TEST-001",
            customer=customer,
            delivery_date=datetime.date(2026, 12, 31),
            status="draft",
            currency="MAD",
            total_amount=Decimal("50000"),
        )
        assert order.ref == "SO-TEST-001"
        assert order.status == "draft"

    def test_str(self, customer, db):
        import datetime
        order = SalesOrder.objects.create(
            ref="SO-TEST-002",
            customer=customer,
            delivery_date=datetime.date(2026, 12, 31),
            status="confirmed",
            currency="MAD",
            total_amount=Decimal("0"),
        )
        assert "SO-TEST-002" in str(order)

    def test_line_total(self, customer, db):
        import datetime
        order = SalesOrder.objects.create(
            ref="SO-TEST-003",
            customer=customer,
            delivery_date=datetime.date(2026, 12, 31),
            status="draft",
            currency="MAD",
            total_amount=Decimal("0"),
        )
        line = SalesOrderLine.objects.create(
            order=order,
            description="Test product",
            qty=Decimal("10"),
            unit_price=Decimal("100"),
            line_total=Decimal("1000"),
        )
        assert line.line_total == Decimal("1000")
