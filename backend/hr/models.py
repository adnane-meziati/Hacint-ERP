from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


# -------------------------------------------------------------------
# Department
# -------------------------------------------------------------------
class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    manager = models.ForeignKey(
        'Employee',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_departments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


# -------------------------------------------------------------------
# Employee
# -------------------------------------------------------------------
class Employee(models.Model):
    class Gender(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        ON_LEAVE = 'on_leave', 'On Leave'
        SUSPENDED = 'suspended', 'Suspended'
        TERMINATED = 'terminated', 'Terminated'

    employee_number = models.CharField(max_length=50, unique=True, verbose_name='Matricule')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    cin = models.CharField(max_length=20, unique=True, verbose_name='CIN / National ID')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)

    phone_number = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)

    hire_date = models.DateField()
    shift_start = models.TimeField(null=True, blank=True)
    shift_end = models.TimeField(null=True, blank=True)
    position = models.CharField(max_length=100, verbose_name='Position / Job Title')
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='employees',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    user = models.OneToOneField(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='employee_profile',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_number})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


# -------------------------------------------------------------------
# Employee Document
# -------------------------------------------------------------------
class EmployeeDocument(models.Model):
    class DocumentType(models.TextChoices):
        CONTRACT = 'contract', 'Employment Contract'
        CIN_COPY = 'cin_copy', 'CIN Copy'
        DIPLOMA = 'diploma', 'Diploma'
        CERTIFICATE = 'certificate', 'Certificate'
        OTHER = 'other', 'Other'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    file = models.FileField(upload_to='hr/documents/%Y/%m/')
    upload_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.employee} - {self.get_document_type_display()}"


# -------------------------------------------------------------------
# Contract
# -------------------------------------------------------------------
class Contract(models.Model):
    class ContractType(models.TextChoices):
        CDI = 'cdi', 'CDI'
        CDD = 'cdd', 'CDD'
        INTERNSHIP = 'internship', 'Internship'
        ANAPEC = 'anapec', 'ANAPEC'
        TEMPORARY = 'temporary', 'Temporary'

    class ContractStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        TERMINATED = 'terminated', 'Terminated'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='contracts')
    contract_type = models.CharField(max_length=20, choices=ContractType.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    document = models.FileField(upload_to='hr/contracts/%Y/%m/', blank=True, null=True)
    base_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.ACTIVE)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee} - {self.get_contract_type_display()} ({self.status})"


# -------------------------------------------------------------------
# Resignation
# -------------------------------------------------------------------
class Resignation(models.Model):
    class ResignationStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='resignations')
    request_date = models.DateField()
    last_working_day = models.DateField()
    reason = models.TextField(blank=True)
    document = models.FileField(upload_to='hr/resignations/%Y/%m/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=ResignationStatus.choices, default=ResignationStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-request_date']

    def __str__(self):
        return f"{self.employee} - Resignation ({self.status})"


# -------------------------------------------------------------------
# Payroll
# -------------------------------------------------------------------
class PayrollRecord(models.Model):
    class PayrollStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        VALIDATED = 'validated', 'Validated'
        PAID = 'paid', 'Paid'
        CANCELLED = 'cancelled', 'Cancelled'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_records')
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bonuses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=PayrollStatus.choices, default=PayrollStatus.DRAFT)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month', 'employee__last_name']
        unique_together = ('employee', 'month', 'year')

    def save(self, *args, **kwargs):
        self.net_salary = (self.base_salary or 0) + (self.overtime_amount or 0) + (self.bonuses or 0) - (self.deductions or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee} - {self.month:02d}/{self.year}"


# -------------------------------------------------------------------
# Leave
# -------------------------------------------------------------------
class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        PAID = 'paid', 'Paid Leave'
        SICK = 'sick', 'Sick Leave'
        UNPAID = 'unpaid', 'Unpaid Leave'
        EXCEPTIONAL = 'exceptional', 'Exceptional Leave'

    class LeaveStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=20, choices=LeaveType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    number_of_days = models.PositiveIntegerField()
    reason = models.TextField(blank=True)
    document = models.FileField(upload_to='hr/leaves/%Y/%m/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)

    approval_comment = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_leaves',
    )
    approval_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee} - {self.get_leave_type_display()} ({self.start_date} -> {self.end_date})"


# -------------------------------------------------------------------
# Attendance
# -------------------------------------------------------------------
class Attendance(models.Model):
    class AttendanceStatus(models.TextChoices):
        PRESENT = 'present', 'Present'
        ABSENT = 'absent', 'Absent'
        LATE = 'late', 'Late'
        HALF_DAY = 'half_day', 'Half Day'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    worked_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.status})"


# -------------------------------------------------------------------
# Recruitment - Job Position
# -------------------------------------------------------------------
class JobPosition(models.Model):
    class PositionStatus(models.TextChoices):
        OPEN = 'open', 'Open'
        CLOSED = 'closed', 'Closed'
        ON_HOLD = 'on_hold', 'On Hold'

    job_title = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='job_positions',
    )
    description = models.TextField(blank=True)
    required_qualifications = models.TextField(blank=True)
    required_experience = models.CharField(max_length=100, blank=True)
    number_of_openings = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=PositionStatus.choices, default=PositionStatus.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_title} ({self.get_status_display()})"


# -------------------------------------------------------------------
# Recruitment - Candidate
# -------------------------------------------------------------------
class Candidate(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    cv = models.FileField(upload_to='hr/candidates/cv/', blank=True, null=True)
    cover_letter = models.FileField(upload_to='hr/candidates/cover_letters/', blank=True, null=True)
    evaluation = models.TextField(blank=True)
    application_date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-application_date']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


# -------------------------------------------------------------------
# Recruitment - Application
# -------------------------------------------------------------------
class Application(models.Model):
    class Stage(models.TextChoices):
        APPLIED = 'applied', 'Applied'
        SCREENING = 'screening', 'Screening'
        INTERVIEW_SCHEDULED = 'interview_scheduled', 'Interview Scheduled'
        INTERVIEWED = 'interviewed', 'Interviewed'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        HIRED = 'hired', 'Hired'

    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='applications')
    job_position = models.ForeignKey(JobPosition, on_delete=models.CASCADE, related_name='applications')
    application_date = models.DateField(auto_now_add=True)
    current_stage = models.CharField(max_length=30, choices=Stage.choices, default=Stage.APPLIED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-application_date']
        unique_together = ('candidate', 'job_position')

    def __str__(self):
        return f"{self.candidate} -> {self.job_position} [{self.current_stage}]"


# -------------------------------------------------------------------
# Recruitment - Interview
# -------------------------------------------------------------------
class Interview(models.Model):
    class Result(models.TextChoices):
        PASSED = 'passed', 'Passed'
        FAILED = 'failed', 'Failed'
        PENDING = 'pending', 'Pending'

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='interviews')
    interview_date = models.DateTimeField()
    interviewer = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='interviews_conducted',
    )
    comments = models.TextField(blank=True)
    result = models.CharField(max_length=20, choices=Result.choices, default=Result.PENDING)

    class Meta:
        ordering = ['-interview_date']

    def __str__(self):
        return f"Interview: {self.application.candidate} on {self.interview_date:%Y-%m-%d} - {self.result}"