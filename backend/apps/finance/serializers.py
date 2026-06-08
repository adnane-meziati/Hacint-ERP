from rest_framework import serializers

from .models import Account, Invoice, InvoiceLine, Payment


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id", "code", "name", "account_type", "currency",
            "balance", "is_active", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ["id", "description", "qty", "unit_price", "tax_rate", "line_total"]
        read_only_fields = ["id", "line_total"]


class PaymentSerializer(serializers.ModelSerializer):
    invoice_ref = serializers.CharField(source="invoice.ref", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "invoice", "invoice_ref", "amount", "payment_date",
            "payment_method", "reference", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    outstanding_amount = serializers.FloatField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "ref", "invoice_type", "customer", "customer_name",
            "vendor", "vendor_name", "issue_date", "due_date",
            "status", "currency", "total_amount", "paid_amount",
            "outstanding_amount", "is_overdue", "notes", "lines", "payments", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_customer_name(self, obj: Invoice) -> str | None:
        return obj.customer.name if obj.customer else None

    def get_vendor_name(self, obj: Invoice) -> str | None:
        return obj.vendor.name if obj.vendor else None
