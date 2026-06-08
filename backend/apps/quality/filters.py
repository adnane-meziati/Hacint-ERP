import django_filters

from .models import Audit, CAPA, Inspection, NonConformity


class InspectionFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="inspection_date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="inspection_date", lookup_expr="lte")

    class Meta:
        model = Inspection
        fields = ["status", "inspector", "from_date", "to_date"]


class NonConformityFilter(django_filters.FilterSet):
    class Meta:
        model = NonConformity
        fields = ["severity", "status"]


class CAPAFilter(django_filters.FilterSet):
    class Meta:
        model = CAPA
        fields = ["action_type", "status", "assigned_to"]


class AuditFilter(django_filters.FilterSet):
    class Meta:
        model = Audit
        fields = ["audit_type", "status"]
