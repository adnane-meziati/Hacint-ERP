from rest_framework import serializers

from .models import PurchaseOrder, PurchaseOrderLine, Receipt, ReceiptLine, RFQ, RFQLine, Vendor


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            "id", "name", "code", "country", "address", "contact_name",
            "contact_email", "contact_phone", "payment_terms", "currency",
            "status", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RFQLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFQLine
        fields = ["id", "description", "qty", "unit", "estimated_unit_price"]
        read_only_fields = ["id"]


class RFQSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    lines = RFQLineSerializer(many=True, read_only=True)

    class Meta:
        model = RFQ
        fields = [
            "id", "ref", "vendor", "vendor_name", "status", "due_date",
            "notes", "lines", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class POLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        fields = ["id", "item_sku", "description", "qty", "unit", "unit_price", "received_qty", "line_total"]
        read_only_fields = ["id", "line_total"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    vendor_code = serializers.CharField(source="vendor.code", read_only=True)
    line_count = serializers.IntegerField(source="lines.count", read_only=True)
    lines = POLineSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "ref", "vendor", "vendor_name", "vendor_code", "rfq",
            "expected_date", "status", "currency", "total_amount",
            "notes", "line_count", "lines", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReceiptLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceiptLine
        fields = ["id", "po_line", "qty_received", "notes"]
        read_only_fields = ["id"]


class ReceiptSerializer(serializers.ModelSerializer):
    po_ref = serializers.CharField(source="purchase_order.ref", read_only=True)
    lines = ReceiptLineSerializer(many=True, read_only=True)

    class Meta:
        model = Receipt
        fields = ["id", "purchase_order", "po_ref", "received_date", "notes", "lines", "created_at"]
        read_only_fields = ["id", "created_at"]
