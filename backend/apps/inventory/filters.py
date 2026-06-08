import django_filters

from .models import Item, StockMovement


class ItemFilter(django_filters.FilterSet):
    low_stock = django_filters.BooleanFilter(method="filter_low_stock", label="Low stock only")

    class Meta:
        model = Item
        fields = ["category", "is_active", "unit_of_measure"]

    def filter_low_stock(self, queryset, name, value):  # type: ignore[override]
        if value:
            ids = [item.id for item in queryset if item.is_low_stock]
            return queryset.filter(id__in=ids)
        return queryset


class StockMovementFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")
    item = django_filters.CharFilter(field_name="item__sku", lookup_expr="iexact")

    class Meta:
        model = StockMovement
        fields = ["movement_type", "item", "from_date", "to_date"]
