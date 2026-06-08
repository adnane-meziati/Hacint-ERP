from django.contrib import admin

from .models import Account, Invoice, InvoiceLine, Payment


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 1


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "account_type", "currency", "balance", "is_active"]
    list_filter = ["account_type", "currency", "is_active"]
    search_fields = ["code", "name"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["ref", "invoice_type", "status", "total_amount", "paid_amount", "due_date", "created_at"]
    list_filter = ["invoice_type", "status", "currency"]
    search_fields = ["ref"]
    inlines = [InvoiceLineInline, PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "invoice", "amount", "payment_date", "payment_method", "reference"]
    list_filter = ["payment_method", "payment_date"]
    search_fields = ["reference", "invoice__ref"]
