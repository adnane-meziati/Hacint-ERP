from rest_framework import serializers

from .models import Customer, Quote, QuoteLine, SalesOrder, SalesOrderLine


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id", "name", "code", "country", "address", "contact_name",
            "contact_email", "contact_phone", "credit_limit", "currency",
            "status", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QuoteLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteLine
        fields = ["id", "description", "qty", "unit_price", "discount", "line_total"]
        read_only_fields = ["id", "line_total"]


class QuoteSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = QuoteLineSerializer(many=True, read_only=True)

    class Meta:
        model = Quote
        fields = [
            "id", "ref", "customer", "customer_name", "validity_date",
            "status", "currency", "total_amount", "notes", "lines",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SalesOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderLine
        fields = ["id", "item_sku", "description", "qty", "unit_price", "delivered_qty", "line_total"]
        read_only_fields = ["id", "line_total"]


class SalesOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_code = serializers.CharField(source="customer.code", read_only=True)
    line_count = serializers.IntegerField(source="lines.count", read_only=True)
    lines = SalesOrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id", "ref", "customer", "customer_name", "customer_code", "quote",
            "order_date", "delivery_date", "status", "currency",
            "total_amount", "notes", "line_count", "lines",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "order_date", "created_at", "updated_at"]
