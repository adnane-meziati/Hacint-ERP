from rest_framework import serializers
from .models import (
    Department, Employee, EmployeeDocument, Contract, Resignation,
    LeaveRequest, Attendance, PayrollRecord, JobPosition, Candidate,
    Application, Interview,
)


# -------------------------------------------------------------------
# Department
# -------------------------------------------------------------------
class DepartmentSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'description', 'manager', 'manager_name',
            'employee_count', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


# -------------------------------------------------------------------
# Employee
# -------------------------------------------------------------------
class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_number', 'first_name', 'last_name',
            'position', 'department', 'department_name', 'status',
            'phone_number', 'email', 'hire_date', 'shift_start', 'shift_end',
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


# -------------------------------------------------------------------
# Employee Document
# -------------------------------------------------------------------
class EmployeeDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = [
            'id', 'employee', 'document_type', 'document_type_display',
            'file', 'upload_date', 'notes',
        ]
        read_only_fields = ['upload_date']


# -------------------------------------------------------------------
# Contract
# -------------------------------------------------------------------
class ContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id', 'employee', 'employee_name', 'contract_type', 'contract_type_display',
            'start_date', 'end_date', 'base_salary', 'status', 'status_display',
            'document', 'document_url', 'notes',
        ]

    def get_document_url(self, obj):
        if not obj.document:
            return None
        return obj.document.url

    def validate(self, data):
        contract_type = data.get('contract_type', getattr(self.instance, 'contract_type', None))
        start = data.get('start_date', getattr(self.instance, 'start_date', None))
        end = data.get('end_date', getattr(self.instance, 'end_date', None))

        if contract_type == Contract.ContractType.CDI:
            data['end_date'] = None
        elif start and end and end < start:
            raise serializers.ValidationError("La date de fin ne peut pas être avant la date de début.")

        return data


# -------------------------------------------------------------------
# Resignation
# -------------------------------------------------------------------
class ResignationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = Resignation
        fields = [
            'id', 'employee', 'employee_name', 'request_date', 'leaving_date',
            'reason', 'document', 'document_url', 'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_document_url(self, obj):
        if not obj.document:
            return None
        return obj.document.url

    def validate(self, data):
        request_date = data.get('request_date', getattr(self.instance, 'request_date', None))
        leaving_date = data.get('leaving_date', getattr(self.instance, 'leaving_date', None))

        if request_date and leaving_date and leaving_date < request_date:
            raise serializers.ValidationError("La date de départ doit être après la date de demande.")

        return data


# -------------------------------------------------------------------
# Leave Request
# -------------------------------------------------------------------
class LeaveRequestSerializer(serializers.ModelSerializer):
    leave_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()

    LEAVE_TYPE_LABELS = {
        'paid': 'Congé payé',
        'sick': 'Congé maladie',
        'unpaid': 'Congé sans solde',
        'exceptional': 'Congé exceptionnel',
    }

    STATUS_LABELS = {
        'pending': 'En attente',
        'approved': 'Approuvée',
        'rejected': 'Rejetée',
        'cancelled': 'Annulée',
    }

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'leave_type', 'leave_type_display',
            'start_date', 'end_date', 'number_of_days', 'reason',
            'document', 'document_url',
            'status', 'status_display', 'approval_comment', 'approved_by',
            'approved_by_name', 'approval_date', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'approved_by', 'approval_date', 'created_at', 'updated_at',
        ]

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None

    def get_leave_type_display(self, obj):
        return self.LEAVE_TYPE_LABELS.get(obj.leave_type, obj.get_leave_type_display())

    def get_status_display(self, obj):
        return self.STATUS_LABELS.get(obj.status, obj.get_status_display())

    def get_document_url(self, obj):
        if not obj.document:
            return None
        return obj.document.url

    def validate(self, data):
        start = data.get('start_date')
        end = data.get('end_date')
        if start and end and end < start:
            raise serializers.ValidationError("La date de fin ne peut pas être avant la date de début.")
        return data


class LeaveApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate_action(self, value):
        return value


# -------------------------------------------------------------------
# Attendance
# -------------------------------------------------------------------
class AttendanceSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    STATUS_LABELS = {
        'present': 'Présent',
        'absent': 'Absent',
        'late': 'En retard',
        'half_day': 'Demi-journée',
    }

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'date',
            'check_in', 'check_out', 'worked_hours', 'overtime_hours',
            'status', 'status_display', 'notes',
        ]

    def get_status_display(self, obj):
        return self.STATUS_LABELS.get(obj.status, obj.get_status_display())

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        if check_in and check_out and check_out < check_in:
            raise serializers.ValidationError("L'heure de sortie ne peut pas être avant l'heure d'entrée.")
        return data


class AttendanceSummarySerializer(serializers.Serializer):
    employee = serializers.IntegerField()
    employee_name = serializers.CharField()
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    total_working_days = serializers.IntegerField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    late_arrivals = serializers.IntegerField()
    total_worked_hours = serializers.DecimalField(max_digits=7, decimal_places=2)
    total_overtime_hours = serializers.DecimalField(max_digits=7, decimal_places=2)


# -------------------------------------------------------------------
# Payroll
# -------------------------------------------------------------------
class PayrollRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status_display = serializers.SerializerMethodField()
    gross_salary = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    net_salary = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    STATUS_LABELS = {
        'draft': 'Brouillon',
        'validated': 'Validée',
        'paid': 'Payée',
    }

    class Meta:
        model = PayrollRecord
        fields = [
            'id', 'employee', 'employee_name', 'month', 'year',
            'base_salary', 'overtime_amount', 'bonuses', 'deductions',
            'gross_salary', 'net_salary', 'status', 'status_display',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_status_display(self, obj):
        return self.STATUS_LABELS.get(obj.status, obj.get_status_display())


# -------------------------------------------------------------------
# Job Position
# -------------------------------------------------------------------
class JobPositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    status_display = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()

    STATUS_LABELS = {
        'open': 'Ouvert',
        'closed': 'Fermé',
        'on_hold': 'En pause',
    }

    class Meta:
        model = JobPosition
        fields = [
            'id', 'job_title', 'department', 'department_name', 'description',
            'required_qualifications', 'required_experience', 'number_of_openings',
            'status', 'status_display', 'applications_count', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_status_display(self, obj):
        return self.STATUS_LABELS.get(obj.status, obj.get_status_display())

    def get_applications_count(self, obj):
        return obj.applications.count()


# -------------------------------------------------------------------
# Candidate
# -------------------------------------------------------------------
class CandidateSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    applications_count = serializers.SerializerMethodField()
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'first_name', 'last_name', 'full_name',
            'phone_number', 'email', 'address',
            'cv', 'cv_url', 'cover_letter', 'evaluation',
            'application_date', 'applications_count',
        ]
        read_only_fields = ['application_date']

    def get_cv_url(self, obj):
        if not obj.cv:
            return None
        return obj.cv.url

    def get_applications_count(self, obj):
        return obj.applications.count()


# -------------------------------------------------------------------
# Application
# -------------------------------------------------------------------
class ApplicationSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.full_name', read_only=True)
    job_title = serializers.CharField(source='job_position.job_title', read_only=True)
    current_stage_display = serializers.SerializerMethodField()

    STAGE_LABELS = {
        'applied': 'Candidature reçue',
        'screening': 'Présélection',
        'interview_scheduled': 'Entretien planifié',
        'interviewed': 'Entretien effectué',
        'accepted': 'Acceptée',
        'rejected': 'Rejetée',
        'hired': 'Embauchée',
    }

    class Meta:
        model = Application
        fields = [
            'id', 'candidate', 'candidate_name', 'job_position', 'job_title',
            'application_date', 'current_stage', 'current_stage_display', 'notes',
        ]
        read_only_fields = ['application_date']

    def get_current_stage_display(self, obj):
        return self.STAGE_LABELS.get(obj.current_stage, obj.get_current_stage_display())


class ApplicationStageSerializer(serializers.Serializer):
    stage = serializers.ChoiceField(choices=Application.Stage.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


# -------------------------------------------------------------------
# Interview
# -------------------------------------------------------------------
class InterviewSerializer(serializers.ModelSerializer):
    result_display = serializers.SerializerMethodField()
    interviewer_name = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()

    RESULT_LABELS = {
        'passed': 'Réussi',
        'failed': 'Échoué',
        'pending': 'En attente',
    }

    class Meta:
        model = Interview
        fields = [
            'id', 'application', 'candidate_name', 'interview_date',
            'interviewer', 'interviewer_name', 'comments', 'result', 'result_display',
        ]

    def get_result_display(self, obj):
        return self.RESULT_LABELS.get(obj.result, obj.get_result_display())

    def get_interviewer_name(self, obj):
        if obj.interviewer:
            return obj.interviewer.get_full_name() or obj.interviewer.username
        return None

    def get_candidate_name(self, obj):
        return obj.application.candidate.full_name


# -------------------------------------------------------------------
# HR Dashboard
# -------------------------------------------------------------------
class HRDashboardSerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    employees_by_department = serializers.ListField()
    employees_on_leave = serializers.IntegerField()
    pending_leave_requests = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    contracts_expiring_soon = serializers.IntegerField()
    resignations_pending = serializers.IntegerField()
    payroll_drafts = serializers.IntegerField()
    open_positions = serializers.IntegerField()