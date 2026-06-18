from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Department, Employee, EmployeeDocument, Contract,
    LeaveRequest, Attendance, JobPosition, Candidate,
    Application, Interview,
)


# -------------------------------------------------------------------
# Department
# -------------------------------------------------------------------
@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager', 'employee_count', 'created_at')
    search_fields = ('name',)
    autocomplete_fields = ('manager',)

    @admin.display(description='Employees')
    def employee_count(self, obj):
        return obj.employees.filter(status='active').count()


# -------------------------------------------------------------------
# Employee
# -------------------------------------------------------------------
class EmployeeDocumentInline(admin.TabularInline):
    model = EmployeeDocument
    extra = 0
    fields = ('document_type', 'file', 'upload_date')
    readonly_fields = ('upload_date',)


class ContractInline(admin.TabularInline):
    model = Contract
    extra = 0
    fields = ('contract_type', 'start_date', 'end_date', 'base_salary', 'status')


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'employee_number', 'full_name', 'department',
        'position', 'status', 'hire_date',
    )
    list_filter = ('status', 'department', 'gender')
    search_fields = ('first_name', 'last_name', 'employee_number', 'cin')
    autocomplete_fields = ('department',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [EmployeeDocumentInline, ContractInline]

    fieldsets = (
        ('Identification', {
            'fields': (
                'employee_number', 'first_name', 'last_name',
                'cin', 'date_of_birth', 'gender',
            ),
        }),
        ('Contact', {
            'fields': ('phone_number', 'email', 'address', 'emergency_contact'),
        }),
        ('Employment', {
            'fields': ('hire_date', 'position', 'department', 'status', 'user'),
        }),
        ('System', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Full Name')
    def full_name(self, obj):
        return obj.full_name


# -------------------------------------------------------------------
# Employee Document
# -------------------------------------------------------------------
@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'document_type', 'upload_date')
    list_filter = ('document_type',)
    search_fields = ('employee__first_name', 'employee__last_name')
    autocomplete_fields = ('employee',)


# -------------------------------------------------------------------
# Contract
# -------------------------------------------------------------------
@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('employee', 'contract_type', 'start_date', 'end_date', 'status')
    list_filter = ('contract_type', 'status')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_number')
    autocomplete_fields = ('employee',)


# -------------------------------------------------------------------
# Leave Request
# -------------------------------------------------------------------
@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = (
        'employee', 'leave_type', 'start_date', 'end_date',
        'number_of_days', 'status', 'approved_by',
    )
    list_filter = ('status', 'leave_type')
    search_fields = ('employee__first_name', 'employee__last_name')
    autocomplete_fields = ('employee',)
    readonly_fields = ('created_at', 'updated_at', 'approval_date')

    actions = ['approve_selected', 'reject_selected']

    @admin.action(description='Approve selected leave requests')
    def approve_selected(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='approved',
            approved_by=request.user,
            approval_date=timezone.now(),
        )
        self.message_user(request, f'{updated} request(s) approved.')

    @admin.action(description='Reject selected leave requests')
    def reject_selected(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='rejected',
            approved_by=request.user,
            approval_date=timezone.now(),
        )
        self.message_user(request, f'{updated} request(s) rejected.')


# -------------------------------------------------------------------
# Attendance
# -------------------------------------------------------------------
@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        'employee', 'date', 'check_in', 'check_out',
        'worked_hours', 'overtime_hours', 'status',
    )
    list_filter = ('status', 'date')
    search_fields = ('employee__first_name', 'employee__last_name')
    date_hierarchy = 'date'
    autocomplete_fields = ('employee',)


# -------------------------------------------------------------------
# Recruitment
# -------------------------------------------------------------------
class InterviewInline(admin.TabularInline):
    model = Interview
    extra = 0
    fields = ('interview_date', 'interviewer', 'result', 'comments')


@admin.register(JobPosition)
class JobPositionAdmin(admin.ModelAdmin):
    list_display = ('job_title', 'department', 'number_of_openings', 'status', 'created_at')
    list_filter = ('status', 'department')
    search_fields = ('job_title',)


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone_number', 'application_date')
    search_fields = ('first_name', 'last_name', 'email')

    @admin.display(description='Full Name')
    def full_name(self, obj):
        return obj.full_name


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'job_position', 'current_stage', 'application_date')
    list_filter = ('current_stage',)
    search_fields = ('candidate__first_name', 'candidate__last_name', 'job_position__job_title')
    inlines = [InterviewInline]


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ('application', 'interview_date', 'interviewer', 'result')
    list_filter = ('result',)
    search_fields = (
        'application__candidate__first_name',
        'application__candidate__last_name',
    )