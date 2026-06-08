import datetime

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.quality.models import Audit, Inspection


@pytest.fixture
def admin(db):
    return User.objects.create_user(username="qa_admin", password="pw", role=Role.ADMIN)


@pytest.fixture
def auth_client(admin):
    c = APIClient()
    c.force_authenticate(user=admin)
    return c


@pytest.fixture
def inspection(admin, db):
    return Inspection.objects.create(
        ref="QC-API-001",
        inspector=admin,
        status="planned",
        inspection_date=datetime.date.today(),
    )


class TestInspectionAPI:
    def test_list(self, auth_client, inspection):
        res = auth_client.get("/api/v1/quality/inspections/")
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_retrieve(self, auth_client, inspection):
        res = auth_client.get(f"/api/v1/quality/inspections/{inspection.id}/")
        assert res.status_code == 200
        assert res.data["ref"] == "QC-API-001"
        assert "inspector_name" in res.data

    def test_filter_by_status(self, auth_client, inspection):
        res = auth_client.get("/api/v1/quality/inspections/?status=planned")
        assert res.status_code == 200
        for item in res.data["results"]:
            assert item["status"] == "planned"

    def test_unauthenticated_denied(self, inspection):
        c = APIClient()
        res = c.get("/api/v1/quality/inspections/")
        assert res.status_code == 401


class TestAuditAPI:
    def test_create(self, auth_client, db):
        res = auth_client.post("/api/v1/quality/audits/", {
            "ref": "AUD-API-001",
            "audit_type": "internal",
            "scope": "Test scope",
            "auditor": "Test auditor",
            "planned_date": str(datetime.date.today() + datetime.timedelta(days=30)),
            "status": "planned",
        })
        assert res.status_code == 201
        assert res.data["ref"] == "AUD-API-001"

    def test_list(self, auth_client, db):
        Audit.objects.create(
            ref="AUD-API-002",
            audit_type="external",
            scope="Supply chain",
            auditor="Lloyd's Register",
            planned_date=datetime.date.today(),
            status="planned",
        )
        res = auth_client.get("/api/v1/quality/audits/")
        assert res.status_code == 200
        assert res.data["count"] >= 1
