from django.contrib import admin

from .models import Department, Employee, PayrollRecord, TimeOffRequest


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "manager", "created_at"]
    search_fields = ["code", "name"]


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["emp_code", "full_name", "department", "job_title", "employment_type", "status", "hire_date"]
    list_filter = ["status", "employment_type", "department"]
    search_fields = ["emp_code", "first_name", "last_name", "email"]


@admin.register(TimeOffRequest)
class TimeOffRequestAdmin(admin.ModelAdmin):
    list_display = ["employee", "leave_type", "start_date", "end_date", "status", "created_at"]
    list_filter = ["leave_type", "status"]
    search_fields = ["employee__emp_code", "employee__last_name"]


@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ["employee", "period_start", "period_end", "gross_salary", "net_salary", "status"]
    list_filter = ["status", "currency"]
    search_fields = ["employee__emp_code", "employee__last_name"]
