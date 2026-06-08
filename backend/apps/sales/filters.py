import django_filters

from .models import Customer, Quote, SalesOrder


class CustomerFilter(django_filters.FilterSet):
    class Meta:
        model = Customer
        fields = ["status", "country"]


class QuoteFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")
    customer = django_filters.CharFilter(field_name="customer__code", lookup_expr="iexact")

    class Meta:
        model = Quote
        fields = ["status", "currency", "customer", "from_date", "to_date"]


class SalesOrderFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="delivery_date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="delivery_date", lookup_expr="lte")
    customer = django_filters.CharFilter(field_name="customer__code", lookup_expr="iexact")

    class Meta:
        model = SalesOrder
        fields = ["status", "currency", "customer", "from_date", "to_date"]
