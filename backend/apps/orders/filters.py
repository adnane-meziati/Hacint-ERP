import django_filters

from .models import Order, OrderLine, OrderStatus, Priority


class OrderFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="delivery_date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="delivery_date", lookup_expr="lte")
    client = django_filters.CharFilter(field_name="client__code", lookup_expr="iexact")
    family = django_filters.CharFilter(field_name="lines__article__family__code", lookup_expr="iexact", distinct=True)
    priority = django_filters.ChoiceFilter(field_name="lines__priority", choices=Priority.choices, distinct=True)

    class Meta:
        model = Order
        fields = ["status", "client", "from_date", "to_date", "family", "priority"]


class OrderLineFilter(django_filters.FilterSet):
    priority = django_filters.ChoiceFilter(choices=Priority.choices)
    status = django_filters.ChoiceFilter(choices=OrderStatus.choices)
    stage = django_filters.CharFilter(field_name="current_stage__code", lookup_expr="iexact")

    class Meta:
        model = OrderLine
        fields = ["priority", "status", "stage"]
