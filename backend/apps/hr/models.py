from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full Time"
    PART_TIME = "part_time", "Part Time"
    CONTRACTOR = "contractor", "Contractor"
    INTERN = "intern", "Intern"


class EmployeeStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    TERMINATED = "terminated", "Terminated"
    ON_LEAVE = "on_leave", "On Leave"


class LeaveType(models.TextChoices):
    ANNUAL = "annual", "Annual"
    SICK = "sick", "Sick"
    UNPAID = "unpaid", "Unpaid"
    MATERNITY = "maternity", "Maternity/Paternity"
    OTHER = "other", "Other"


class LeaveStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"


class PayrollStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PAID = "paid", "Paid"
    CANCELLED = "cancelled", "Cancelled"


class Department(TimeStampedModel):
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=16, unique=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_departments",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class Employee(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="employee_profile"
    )
    emp_code = models.CharField(max_length=32, unique=True)
    first_name = models.CharField(max_length=64)
    last_name = models.CharField(max_length=64)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="employees")
    job_title = models.CharField(max_length=128)
    hire_date = models.DateField()
    employment_type = models.CharField(
        max_length=16, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    status = models.CharField(max_length=16, choices=EmployeeStatus.choices, default=EmployeeStatus.ACTIVE)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    salary_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="MAD")

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return f"{self.emp_code} — {self.first_name} {self.last_name}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class TimeOffRequest(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="time_off_requests")
    leave_type = models.CharField(max_length=16, choices=LeaveType.choices, default=LeaveType.ANNUAL)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=16, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    notes = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_leave_requests",
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self) -> str:
        return f"{self.employee.emp_code} / {self.leave_type} {self.start_date}–{self.end_date}"


class PayrollRecord(TimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_records")
    period_start = models.DateField()
    period_end = models.DateField()
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="MAD")
    status = models.CharField(max_length=16, choices=PayrollStatus.choices, default=PayrollStatus.DRAFT)
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-period_start"]

    def save(self, *args, **kwargs):  # type: ignore[override]
        self.net_salary = self.gross_salary - self.deductions
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee.emp_code} {self.period_start}–{self.period_end}"
