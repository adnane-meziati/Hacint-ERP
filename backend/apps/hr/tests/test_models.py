import datetime
from decimal import Decimal

import pytest

from apps.hr.models import Department, Employee, PayrollRecord, TimeOffRequest


@pytest.fixture
def department(db):
    return Department.objects.create(code="TEST-DEPT", name="Test Department")


@pytest.fixture
def employee(department, db):
    return Employee.objects.create(
        emp_code="EMP-T001",
        first_name="Test",
        last_name="Employee",
        department=department,
        job_title="Engineer",
        hire_date=datetime.date(2020, 1, 1),
        employment_type="full_time",
        status="active",
        salary_base=Decimal("20000"),
        currency="MAD",
    )


class TestDepartment:
    def test_str(self, department):
        assert "Test Department" in str(department)


class TestEmployee:
    def test_full_name(self, employee):
        assert employee.full_name == "Test Employee"

    def test_str(self, employee):
        assert "EMP-T001" in str(employee)

    def test_status_default_active(self, employee):
        assert employee.status == "active"


class TestTimeOffRequest:
    def test_create(self, employee, db):
        req = TimeOffRequest.objects.create(
            employee=employee,
            leave_type="annual",
            start_date=datetime.date(2026, 7, 1),
            end_date=datetime.date(2026, 7, 14),
            status="pending",
        )
        assert req.status == "pending"
        assert employee.time_off_requests.count() == 1


class TestPayrollRecord:
    def test_create(self, employee, db):
        record = PayrollRecord.objects.create(
            employee=employee,
            period_start=datetime.date(2026, 1, 1),
            period_end=datetime.date(2026, 1, 31),
            gross_salary=Decimal("20000"),
            deductions=Decimal("3000"),
            net_salary=Decimal("17000"),
            currency="MAD",
            status="draft",
        )
        assert record.net_salary == Decimal("17000")
        assert record.status == "draft"
