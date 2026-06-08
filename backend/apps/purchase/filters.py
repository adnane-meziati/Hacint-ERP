import django_filters

from .models import PurchaseOrder, RFQ, Vendor


class VendorFilter(django_filters.FilterSet):
    class Meta:
        model = Vendor
        fields = ["status", "country"]


class RFQFilter(django_filters.FilterSet):
    vendor = django_filters.CharFilter(field_name="vendor__code", lookup_expr="iexact")

    class Meta:
        model = RFQ
        fields = ["status", "vendor"]


class PurchaseOrderFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="expected_date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="expected_date", lookup_expr="lte")
    vendor = django_filters.CharFilter(field_name="vendor__code", lookup_expr="iexact")

    class Meta:
        model = PurchaseOrder
        fields = ["status", "currency", "vendor", "from_date", "to_date"]
