import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.hr.models import Department, Employee


@pytest.fixture
def admin(db):
    return User.objects.create_user(username="hr_admin", password="pw", role=Role.ADMIN)


@pytest.fixture
def auth_client(admin):
    c = APIClient()
    c.force_authenticate(user=admin)
    return c


@pytest.fixture
def department(db):
    return Department.objects.create(code="API-DEPT", name="API Department")


@pytest.fixture
def employee(department, db):
    return Employee.objects.create(
        emp_code="EMP-API-001",
        first_name="API",
        last_name="Test",
        department=department,
        job_title="Tester",
        hire_date=datetime.date(2022, 1, 1),
        employment_type="full_time",
        status="active",
        salary_base=Decimal("15000"),
        currency="MAD",
    )


class TestDepartmentAPI:
    def test_list(self, auth_client, department):
        res = auth_client.get("/api/v1/hr/departments/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_retrieve_has_employee_count(self, auth_client, department):
        res = auth_client.get(f"/api/v1/hr/departments/{department.id}/")
        assert res.status_code == 200
        assert "employee_count" in res.data


class TestEmployeeAPI:
    def test_list(self, auth_client, employee):
        res = auth_client.get("/api/v1/hr/employees/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_retrieve_has_full_name(self, auth_client, employee):
        res = auth_client.get(f"/api/v1/hr/employees/{employee.id}/")
        assert res.status_code == 200
        assert res.data["full_name"] == "API Test"
        assert "department_name" in res.data

    def test_filter_by_status(self, auth_client, employee):
        res = auth_client.get("/api/v1/hr/employees/?status=active")
        assert res.status_code == 200
        for e in res.data["results"]:
            assert e["status"] == "active"

    def test_unauthenticated_denied(self, employee):
        c = APIClient()
        res = c.get("/api/v1/hr/employees/")
        assert res.status_code == 401
