import datetime
from decimal import Decimal

import pytest

from apps.finance.models import Account, Invoice, InvoiceLine, Payment
from apps.sales.models import Customer


@pytest.fixture
def customer(db):
    return Customer.objects.create(
        code="FIN-CUST-01",
        name="Finance Customer",
        country="MA",
        status="active",
    )


@pytest.fixture
def invoice(customer, db):
    return Invoice.objects.create(
        ref="INV-T001",
        invoice_type="customer",
        customer=customer,
        issue_date=datetime.date.today() - datetime.timedelta(days=10),
        due_date=datetime.date.today() + datetime.timedelta(days=20),
        status="sent",
        currency="MAD",
        total_amount=Decimal("10000"),
        paid_amount=Decimal("0"),
    )


class TestInvoice:
    def test_outstanding_amount(self, invoice):
        assert invoice.outstanding_amount == Decimal("10000")

    def test_outstanding_after_partial_payment(self, invoice):
        invoice.paid_amount = Decimal("3000")
        invoice.save()
        assert invoice.outstanding_amount == Decimal("7000")

    def test_is_not_overdue(self, invoice):
        assert invoice.is_overdue is False

    def test_is_overdue(self, customer, db):
        inv = Invoice.objects.create(
            ref="INV-T002",
            invoice_type="customer",
            customer=customer,
            issue_date=datetime.date.today() - datetime.timedelta(days=40),
            due_date=datetime.date.today() - datetime.timedelta(days=10),
            status="sent",
            currency="MAD",
            total_amount=Decimal("5000"),
            paid_amount=Decimal("0"),
        )
        assert inv.is_overdue is True

    def test_paid_invoice_not_overdue(self, customer, db):
        inv = Invoice.objects.create(
            ref="INV-T003",
            invoice_type="customer",
            customer=customer,
            issue_date=datetime.date.today() - datetime.timedelta(days=40),
            due_date=datetime.date.today() - datetime.timedelta(days=10),
            status="paid",
            currency="MAD",
            total_amount=Decimal("5000"),
            paid_amount=Decimal("5000"),
        )
        assert inv.is_overdue is False


class TestAccount:
    def test_create(self, db):
        acc = Account.objects.create(
            code="411000",
            name="Clients",
            account_type="asset",
            currency="MAD",
        )
        assert acc.code == "411000"
        assert acc.balance == Decimal("0")
