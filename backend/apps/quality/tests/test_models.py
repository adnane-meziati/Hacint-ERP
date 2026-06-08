import datetime

import pytest

from apps.accounts.models import Role, User
from apps.quality.models import Audit, CAPA, Inspection, InspectionLine, NonConformity


@pytest.fixture
def inspector(db):
    return User.objects.create_user(username="inspector_t", password="pw", role=Role.QC)


@pytest.fixture
def inspection(inspector, db):
    return Inspection.objects.create(
        ref="QC-T001",
        inspector=inspector,
        status="planned",
        inspection_date=datetime.date.today(),
    )


class TestInspection:
    def test_str(self, inspection):
        assert "QC-T001" in str(inspection)

    def test_add_lines(self, inspection, db):
        InspectionLine.objects.create(
            inspection=inspection,
            checkpoint="Dimension check",
            result="pass",
        )
        assert inspection.lines.count() == 1

    def test_status_transitions(self, inspection, db):
        inspection.status = "in_progress"
        inspection.save()
        assert Inspection.objects.get(pk=inspection.pk).status == "in_progress"


class TestNonConformity:
    def test_create_from_inspection(self, inspection, db):
        ncr = NonConformity.objects.create(
            ref="NCR-T001",
            inspection=inspection,
            description="Surface defect",
            severity="minor",
            status="open",
        )
        assert ncr.inspection == inspection

    def test_create_capa(self, inspection, inspector, db):
        ncr = NonConformity.objects.create(
            ref="NCR-T002",
            description="Assembly issue",
            severity="major",
            status="open",
        )
        capa = CAPA.objects.create(
            ncr=ncr,
            action_type="corrective",
            description="Re-train assembly team",
            assigned_to=inspector,
            due_date=datetime.date.today() + datetime.timedelta(days=30),
            status="open",
        )
        assert capa.ncr == ncr
        assert ncr.capas.count() == 1


class TestAudit:
    def test_create(self, db):
        audit = Audit.objects.create(
            ref="AUD-T001",
            audit_type="internal",
            scope="Manufacturing process",
            auditor="Bureau Veritas",
            planned_date=datetime.date.today() + datetime.timedelta(days=30),
            status="planned",
        )
        assert audit.status == "planned"
        assert audit.actual_date is None
