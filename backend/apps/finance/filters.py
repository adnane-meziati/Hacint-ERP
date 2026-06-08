import django_filters

from .models import Invoice, Payment


class InvoiceFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="issue_date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")

    class Meta:
        model = Invoice
        fields = ["invoice_type", "status", "currency", "customer", "vendor"]


class PaymentFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="payment_date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="payment_date", lookup_expr="lte")

    class Meta:
        model = Payment
        fields = ["payment_method", "invoice"]
