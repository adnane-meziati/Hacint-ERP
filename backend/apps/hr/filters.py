import django_filters

from .models import Employee, PayrollRecord, TimeOffRequest


class EmployeeFilter(django_filters.FilterSet):
    class Meta:
        model = Employee
        fields = ["status", "employment_type", "department"]


class TimeOffFilter(django_filters.FilterSet):
    class Meta:
        model = TimeOffRequest
        fields = ["leave_type", "status", "employee"]


class PayrollFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="period_start", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="period_end", lookup_expr="lte")

    class Meta:
        model = PayrollRecord
        fields = ["status", "currency", "employee"]
