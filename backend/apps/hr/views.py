from rest_framework import viewsets

from common.permissions import IsReadOnlyForClient

from .filters import EmployeeFilter, PayrollFilter, TimeOffFilter
from .models import Department, Employee, PayrollRecord, TimeOffRequest
from .serializers import DepartmentSerializer, EmployeeSerializer, PayrollRecordSerializer, TimeOffRequestSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("manager").prefetch_related("employees")
    serializer_class = DepartmentSerializer
    permission_classes = [IsReadOnlyForClient]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code"]


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department", "user")
    serializer_class = EmployeeSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = EmployeeFilter
    search_fields = ["emp_code", "first_name", "last_name", "email", "job_title"]
    ordering_fields = ["last_name", "emp_code", "hire_date"]


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    queryset = TimeOffRequest.objects.select_related("employee", "approved_by")
    serializer_class = TimeOffRequestSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = TimeOffFilter
    search_fields = ["employee__emp_code", "employee__last_name"]
    ordering_fields = ["start_date", "created_at"]


class PayrollRecordViewSet(viewsets.ModelViewSet):
    queryset = PayrollRecord.objects.select_related("employee__department")
    serializer_class = PayrollRecordSerializer
    permission_classes = [IsReadOnlyForClient]
    filterset_class = PayrollFilter
    search_fields = ["employee__emp_code", "employee__last_name"]
    ordering_fields = ["period_start", "created_at"]
