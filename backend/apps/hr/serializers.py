from rest_framework import serializers

from .models import Department, Employee, PayrollRecord, TimeOffRequest


class DepartmentSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.username", read_only=True, default=None)
    employee_count = serializers.IntegerField(source="employees.count", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "code", "manager", "manager_name", "employee_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "emp_code", "first_name", "last_name", "full_name",
            "department", "department_name", "job_title", "hire_date",
            "employment_type", "status", "phone", "email",
            "salary_base", "currency", "created_at",
        ]
        read_only_fields = ["id", "full_name", "created_at"]


class TimeOffRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.username", read_only=True, default=None)

    class Meta:
        model = TimeOffRequest
        fields = [
            "id", "employee", "employee_name", "leave_type",
            "start_date", "end_date", "status", "notes",
            "approved_by", "approved_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PayrollRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.emp_code", read_only=True)

    class Meta:
        model = PayrollRecord
        fields = [
            "id", "employee", "employee_name", "employee_code",
            "period_start", "period_end", "gross_salary", "deductions",
            "net_salary", "currency", "status", "paid_date", "notes", "created_at",
        ]
        read_only_fields = ["id", "net_salary", "created_at"]
