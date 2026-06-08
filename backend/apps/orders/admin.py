from django.contrib import admin

from .models import Order, OrderLine


class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 0
    fields = ["n_serie", "article", "quantity", "priority", "status", "current_stage"]
    readonly_fields = ["current_stage"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["n_ordre", "client", "status", "delivery_date", "created_at"]
    list_filter = ["status", "client"]
    search_fields = ["n_ordre", "client__code"]
    inlines = [OrderLineInline]


@admin.register(OrderLine)
class OrderLineAdmin(admin.ModelAdmin):
    list_display = ["order", "n_serie", "article", "priority", "status", "current_stage"]
    list_filter = ["priority", "status", "current_stage"]
    search_fields = ["order__n_ordre", "article__ref_client"]
