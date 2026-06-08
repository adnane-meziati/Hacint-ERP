from django.contrib import admin

from .models import PurchaseOrder, PurchaseOrderLine, RFQ, RFQLine, Receipt, ReceiptLine, Vendor


class RFQLineInline(admin.TabularInline):
    model = RFQLine
    extra = 1


class POLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 1


class ReceiptLineInline(admin.TabularInline):
    model = ReceiptLine
    extra = 1


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "country", "status", "created_at"]
    list_filter = ["status", "country"]
    search_fields = ["code", "name", "contact_email"]


@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ["ref", "vendor", "status", "due_date", "created_at"]
    list_filter = ["status"]
    search_fields = ["ref", "vendor__code", "vendor__name"]
    inlines = [RFQLineInline]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["ref", "vendor", "status", "total_amount", "expected_date", "created_at"]
    list_filter = ["status"]
    search_fields = ["ref", "vendor__code", "vendor__name"]
    inlines = [POLineInline]


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ["id", "purchase_order", "received_date", "created_at"]
    list_filter = ["received_date"]
    inlines = [ReceiptLineInline]
