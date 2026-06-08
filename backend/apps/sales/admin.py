from django.contrib import admin

from .models import Customer, Quote, QuoteLine, SalesOrder, SalesOrderLine


class QuoteLineInline(admin.TabularInline):
    model = QuoteLine
    extra = 1


class SalesOrderLineInline(admin.TabularInline):
    model = SalesOrderLine
    extra = 1


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "country", "status", "created_at"]
    list_filter = ["status", "country"]
    search_fields = ["code", "name", "contact_email"]


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ["ref", "customer", "status", "total_amount", "currency", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["ref", "customer__name", "customer__code"]
    inlines = [QuoteLineInline]


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ["ref", "customer", "status", "total_amount", "currency", "delivery_date", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["ref", "customer__name", "customer__code"]
    inlines = [SalesOrderLineInline]
