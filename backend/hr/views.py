from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Department, Employee, EmployeeDocument, Contract, Resignation,
    LeaveRequest, Attendance, PayrollRecord, JobPosition, Candidate,
    Application, Interview,
)
from .serializers import (
    DepartmentSerializer,
    EmployeeListSerializer, EmployeeDetailSerializer,
    EmployeeDocumentSerializer,
    ContractSerializer, ResignationSerializer,
    LeaveRequestSerializer,
    AttendanceSerializer, AttendanceSummarySerializer,
    PayrollRecordSerializer,
    JobPositionSerializer,
    CandidateSerializer,
    ApplicationSerializer, ApplicationStageSerializer,
    InterviewSerializer,
    HRDashboardSerializer,
)
from .permissions import IsHRManager, IsDepartmentManagerOrHR, IsOwnerOrHR


# -------------------------------------------------------------------
# Department
# -------------------------------------------------------------------
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('manager').all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDepartmentManagerOrHR]

    def get_queryset(self):
        qs = super().get_queryset()
        name = self.request.query_params.get('name')
        if name:
            qs = qs.filter(name__icontains=name)
        return qs


# -------------------------------------------------------------------
# Employee
# -------------------------------------------------------------------
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('department').all()
    permission_classes = [permissions.IsAuthenticated, IsDepartmentManagerOrHR]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        dept = params.get('department')
        status_filter = params.get('status')
        search = params.get('search')

        if dept:
            qs = qs.filter(department_id=dept)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_number__icontains=search) |
                Q(cin__icontains=search)
            )

        user = self.request.user
        if hasattr(user, 'employee_profile') and not user.is_staff:
            try:
                emp = user.employee_profile
                managed = emp.managed_departments.values_list('id', flat=True)
                if managed.exists():
                    qs = qs.filter(department_id__in=managed)
                else:
                    qs = qs.filter(id=emp.id)
            except Exception:
                pass

        return qs

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        try:
            employee = request.user.employee_profile
        except Employee.DoesNotExist:
            return Response({'detail': 'Profil employé introuvable.'}, status=404)

        serializer = EmployeeDetailSerializer(employee)
        return Response(serializer.data)


# -------------------------------------------------------------------
# Employee Documents
# -------------------------------------------------------------------
class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrHR]

    def get_queryset(self):
        user = self.request.user
        qs = EmployeeDocument.objects.select_related('employee')

        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        if not user.is_staff and hasattr(user, 'employee_profile'):
            emp = user.employee_profile
            if not emp.managed_departments.exists():
                qs = qs.filter(employee=emp)

        return qs


# -------------------------------------------------------------------
# Contract
# -------------------------------------------------------------------
class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = Contract.objects.select_related('employee')
        employee_id = self.request.query_params.get('employee')
        status_filter = self.request.query_params.get('status')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    @action(detail=False, methods=['get'], url_path='expiring-soon')
    def expiring_soon(self, request):
        today = date.today()
        threshold = today + timedelta(days=30)
        qs = Contract.objects.filter(
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=threshold,
            status=Contract.ContractStatus.ACTIVE,
        ).select_related('employee')

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# -------------------------------------------------------------------
# Resignation
# -------------------------------------------------------------------
class ResignationViewSet(viewsets.ModelViewSet):
    serializer_class = ResignationSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = Resignation.objects.select_related('employee')
        employee_id = self.request.query_params.get('employee')
        status_filter = self.request.query_params.get('status')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def perform_create(self, serializer):
        resignation = serializer.save()

        if resignation.status == Resignation.ResignationStatus.APPROVED:
            employee = resignation.employee
            employee.status = Employee.Status.TERMINATED
            employee.save(update_fields=['status', 'updated_at'])


# -------------------------------------------------------------------
# Leave Request
# -------------------------------------------------------------------
class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.select_related('employee', 'approved_by')

        params = self.request.query_params
        employee_id = params.get('employee')
        status_filter = params.get('status')
        leave_type = params.get('leave_type')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if leave_type:
            qs = qs.filter(leave_type=leave_type)

        if not user.is_staff and hasattr(user, 'employee_profile'):
            emp = user.employee_profile
            if not emp.managed_departments.exists():
                qs = qs.filter(employee=emp)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and hasattr(user, 'employee_profile'):
            serializer.save(employee=user.employee_profile)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='approve',
            permission_classes=[permissions.IsAuthenticated, IsDepartmentManagerOrHR])
    def approve(self, request, pk=None):
        leave = self.get_object()

        if leave.status != LeaveRequest.LeaveStatus.PENDING:
            return Response(
                {'detail': 'Seules les demandes en attente peuvent être approuvées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.status = LeaveRequest.LeaveStatus.APPROVED
        leave.approved_by = request.user
        leave.approval_date = timezone.now()
        leave.approval_comment = request.data.get('comment', '')
        leave.save()

        serializer = LeaveRequestSerializer(leave, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reject',
            permission_classes=[permissions.IsAuthenticated, IsDepartmentManagerOrHR])
    def reject(self, request, pk=None):
        leave = self.get_object()

        if leave.status != LeaveRequest.LeaveStatus.PENDING:
            return Response(
                {'detail': 'Seules les demandes en attente peuvent être rejetées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.status = LeaveRequest.LeaveStatus.REJECTED
        leave.approved_by = request.user
        leave.approval_date = timezone.now()
        leave.approval_comment = request.data.get('comment', '')
        leave.save()

        serializer = LeaveRequestSerializer(leave, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        leave = self.get_object()
        user = request.user

        is_owner = hasattr(user, 'employee_profile') and user.employee_profile == leave.employee
        if not is_owner and not user.is_staff:
            return Response({'detail': 'Action non autorisée.'}, status=status.HTTP_403_FORBIDDEN)

        if leave.status != LeaveRequest.LeaveStatus.PENDING:
            return Response(
                {'detail': 'Seules les demandes en attente peuvent être annulées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.status = LeaveRequest.LeaveStatus.CANCELLED
        leave.save()

        serializer = LeaveRequestSerializer(leave, context={'request': request})
        return Response(serializer.data)


# -------------------------------------------------------------------
# Attendance
# -------------------------------------------------------------------
def _decimal_hours(start_time, end_time):
    if not start_time or not end_time:
        return Decimal('0.00')

    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute

    if end_minutes < start_minutes:
        return Decimal('0.00')

    minutes = end_minutes - start_minutes
    return (Decimal(minutes) / Decimal('60')).quantize(Decimal('0.01'))


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related('employee')

        params = self.request.query_params
        employee_id = params.get('employee')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        att_status = params.get('status')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if att_status:
            qs = qs.filter(status=att_status)

        if not user.is_staff and hasattr(user, 'employee_profile'):
            emp = user.employee_profile
            if not emp.managed_departments.exists():
                qs = qs.filter(employee=emp)

        return qs

    def _with_calculated_hours(self, data, instance=None):
        payload = data.copy()
        employee_id = payload.get('employee') or getattr(instance, 'employee_id', None)
        status_value = payload.get('status') or getattr(instance, 'status', Attendance.AttendanceStatus.PRESENT)
        employee = Employee.objects.filter(id=employee_id).first()

        if status_value == Attendance.AttendanceStatus.ABSENT:
            payload['check_in'] = None
            payload['check_out'] = None
            payload['worked_hours'] = Decimal('0.00')
            payload['overtime_hours'] = Decimal('0.00')
            return payload

        serializer_for_times = self.get_serializer(instance, data=payload, partial=True)
        serializer_for_times.is_valid(raise_exception=True)
        attrs = serializer_for_times.validated_data

        check_in = attrs.get('check_in', getattr(instance, 'check_in', None))
        check_out = attrs.get('check_out', getattr(instance, 'check_out', None))

        if employee and status_value == Attendance.AttendanceStatus.PRESENT:
            check_in = employee.shift_start
            check_out = employee.shift_end
            payload['check_in'] = check_in
            payload['check_out'] = check_out

        if employee and status_value == Attendance.AttendanceStatus.LATE and not check_out:
            check_out = employee.shift_end
            payload['check_out'] = check_out

        worked_hours = _decimal_hours(check_in, check_out)
        payload['worked_hours'] = worked_hours

        overtime = payload.get('overtime_hours')
        if overtime in ('', None):
            payload['overtime_hours'] = Decimal('0.00')

        return payload

    def create(self, request, *args, **kwargs):
        payload = self._with_calculated_hours(request.data)
        employee_id = payload.get('employee')
        attendance_date = payload.get('date')

        if employee_id and attendance_date:
            existing = Attendance.objects.filter(
                employee_id=employee_id,
                date=attendance_date,
            ).first()

            if existing:
                payload = self._with_calculated_hours(payload, existing)
                serializer = self.get_serializer(existing, data=payload, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        payload = self._with_calculated_hours(request.data, instance)
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        today = date.today()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))
        employee_id = request.query_params.get('employee')

        qs = Attendance.objects.filter(date__month=month, date__year=year)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        summaries = (
            qs.values('employee', 'employee__first_name', 'employee__last_name')
            .annotate(
                total_working_days=Count('id'),
                present_days=Count('id', filter=Q(status='present')),
                absent_days=Count('id', filter=Q(status='absent')),
                late_arrivals=Count('id', filter=Q(status='late')),
                total_worked_hours=Sum('worked_hours'),
                total_overtime_hours=Sum('overtime_hours'),
            )
        )

        results = []
        for s in summaries:
            results.append({
                'employee': s['employee'],
                'employee_name': f"{s['employee__first_name']} {s['employee__last_name']}",
                'month': month,
                'year': year,
                'total_working_days': s['total_working_days'],
                'present_days': s['present_days'],
                'absent_days': s['absent_days'],
                'late_arrivals': s['late_arrivals'],
                'total_worked_hours': s['total_worked_hours'] or 0,
                'total_overtime_hours': s['total_overtime_hours'] or 0,
            })

        serializer = AttendanceSummarySerializer(results, many=True)
        return Response(serializer.data)


# -------------------------------------------------------------------
# Payroll
# -------------------------------------------------------------------
class PayrollRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = PayrollRecord.objects.select_related('employee')
        employee_id = self.request.query_params.get('employee')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        status_filter = self.request.query_params.get('status')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs


# -------------------------------------------------------------------
# Job Position
# -------------------------------------------------------------------
class JobPositionViewSet(viewsets.ModelViewSet):
    queryset = JobPosition.objects.select_related('department').all()
    serializer_class = JobPositionSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        department = self.request.query_params.get('department')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if department:
            qs = qs.filter(department_id=department)

        return qs


# -------------------------------------------------------------------
# Candidate
# -------------------------------------------------------------------
class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')

        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        return qs

    @action(detail=True, methods=['post'], url_path='convert-to-employee')
    def convert_to_employee(self, request, pk=None):
        candidate = self.get_object()

        hired_app = candidate.applications.filter(
            current_stage=Application.Stage.HIRED
        ).first()

        if not hired_app:
            return Response(
                {'detail': 'Le candidat doit être au statut embauché avant la conversion.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_fields = ['employee_number', 'cin', 'hire_date', 'position']
        for field in required_fields:
            if field not in request.data:
                return Response(
                    {'detail': f'Champ obligatoire manquant : {field}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        employee = Employee.objects.create(
            first_name=candidate.first_name,
            last_name=candidate.last_name,
            phone_number=candidate.phone_number,
            email=candidate.email,
            address=candidate.address,
            employee_number=request.data['employee_number'],
            cin=request.data['cin'],
            hire_date=request.data['hire_date'],
            position=request.data['position'],
            department=hired_app.job_position.department,
            status=Employee.Status.ACTIVE,
        )

        serializer = EmployeeDetailSerializer(employee)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# -------------------------------------------------------------------
# Application
# -------------------------------------------------------------------
class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related('candidate', 'job_position').all()
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        candidate_id = self.request.query_params.get('candidate')
        position_id = self.request.query_params.get('job_position')
        stage = self.request.query_params.get('stage')

        if candidate_id:
            qs = qs.filter(candidate_id=candidate_id)
        if position_id:
            qs = qs.filter(job_position_id=position_id)
        if stage:
            qs = qs.filter(current_stage=stage)

        return qs

    @action(detail=True, methods=['post'], url_path='update-stage')
    def update_stage(self, request, pk=None):
        application = self.get_object()
        serializer = ApplicationStageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application.current_stage = serializer.validated_data['stage']
        if 'notes' in serializer.validated_data:
            application.notes = serializer.validated_data['notes']
        application.save()

        return Response(ApplicationSerializer(application).data)


# -------------------------------------------------------------------
# Interview
# -------------------------------------------------------------------
class InterviewViewSet(viewsets.ModelViewSet):
    queryset = Interview.objects.select_related('application__candidate', 'interviewer').all()
    serializer_class = InterviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsHRManager]

    def get_queryset(self):
        qs = super().get_queryset()
        application_id = self.request.query_params.get('application')
        result = self.request.query_params.get('result')

        if application_id:
            qs = qs.filter(application_id=application_id)
        if result:
            qs = qs.filter(result=result)

        return qs


# -------------------------------------------------------------------
# HR Dashboard
# -------------------------------------------------------------------
class HRDashboardView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsDepartmentManagerOrHR]

    @action(detail=False, methods=['get'], url_path='')
    def dashboard(self, request):
        today = date.today()
        thirty_days = today + timedelta(days=30)

        total_employees = Employee.objects.filter(status=Employee.Status.ACTIVE).count()

        employees_by_department = list(
            Employee.objects.filter(status=Employee.Status.ACTIVE)
            .values('department__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        employees_on_leave = LeaveRequest.objects.filter(
            status=LeaveRequest.LeaveStatus.APPROVED,
            start_date__lte=today,
            end_date__gte=today,
        ).values('employee').distinct().count()

        pending_leave_requests = LeaveRequest.objects.filter(
            status=LeaveRequest.LeaveStatus.PENDING
        ).count()

        month_records = Attendance.objects.filter(
            date__month=today.month,
            date__year=today.year,
        )
        total_records = month_records.count()
        present_records = month_records.filter(status=Attendance.AttendanceStatus.PRESENT).count()
        attendance_rate = round((present_records / total_records * 100), 2) if total_records else 0.0

        contracts_expiring_soon = Contract.objects.filter(
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=thirty_days,
            status=Contract.ContractStatus.ACTIVE,
        ).count()

        resignations_pending = Resignation.objects.filter(
            status=Resignation.ResignationStatus.PENDING
        ).count()

        payroll_drafts = PayrollRecord.objects.filter(
            month=today.month,
            year=today.year,
            status=PayrollRecord.PayrollStatus.DRAFT,
        ).count()

        open_positions = JobPosition.objects.filter(
            status=JobPosition.PositionStatus.OPEN
        ).count()

        data = {
            'total_employees': total_employees,
            'employees_by_department': employees_by_department,
            'employees_on_leave': employees_on_leave,
            'pending_leave_requests': pending_leave_requests,
            'attendance_rate': attendance_rate,
            'contracts_expiring_soon': contracts_expiring_soon,
            'resignations_pending': resignations_pending,
            'payroll_drafts': payroll_drafts,
            'open_positions': open_positions,
        }

        serializer = HRDashboardSerializer(data)
        return Response(serializer.data)