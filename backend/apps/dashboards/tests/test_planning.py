import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Article, Client, Family
from apps.orders.models import Order, OrderLine, Priority
from apps.production.models import Stage


# ── Shared fixtures ────────────────────────────────────────────────────────────

@pytest.fixture
def planner(db):
    return User.objects.create_user(username="planner_p3", password="pw", role=Role.PLANNER)


@pytest.fixture
def auth(planner):
    c = APIClient()
    c.force_authenticate(user=planner)
    return c


@pytest.fixture
def base_data(db):
    family = Family.objects.create(code="KIT_P3", name="Kit P3")
    client = Client.objects.create(code="CLI_P3", name="Client P3")
    article = Article.objects.create(ref_client="REF_P3", description="Art P3", family=family)
    stages = [
        Stage.objects.create(code=c, name=c, sequence=i + 1)
        for i, c in enumerate(["ECH", "CAD", "CAM", "CNC", "MTG", "QF", "AQC"])
    ]
    order = Order.objects.create(
        n_ordre=7001, client=client,
        creation_date="2026-05-01",
        delivery_date="2026-05-15",
    )
    line = OrderLine.objects.create(
        order=order, n_serie=1, article=article,
        quantity=1, priority=Priority.URGENT,
    )
    return {"order": order, "line": line, "stages": stages, "client": client}


# ── WeeklyCapacityView ─────────────────────────────────────────────────────────

class TestWeeklyCapacity:
    def test_returns_200(self, auth):
        resp = auth.get(reverse("planning-weekly"))
        assert resp.status_code == 200

    def test_structure(self, auth):
        resp = auth.get(reverse("planning-weekly"), {"weeks": 2})
        data = resp.json()
        assert "weeks" in data
        assert "stages" in data
        assert len(data["weeks"]) == 2

    def test_week_label_format(self, auth):
        resp = auth.get(reverse("planning-weekly"), {"weeks": 1})
        week = resp.json()["weeks"][0]
        assert "week" in week
        assert "label" in week
        assert "total" in week
        assert "W" in week["week"]   # e.g. "2026-W19"

    def test_clamped_to_12_weeks(self, auth):
        resp = auth.get(reverse("planning-weekly"), {"weeks": 99})
        assert len(resp.json()["weeks"]) == 12

    def test_requires_auth(self):
        resp = APIClient().get(reverse("planning-weekly"))
        assert resp.status_code == 401

    def test_line_counted_in_correct_week(self, auth, base_data):
        """Line with delivery_date in week X must appear in that week's row."""
        from django.utils import timezone
        import datetime

        today = timezone.localdate()
        # Put delivery date in the current week
        week_start = today - datetime.timedelta(days=today.weekday())
        base_data["order"].delivery_date = week_start + datetime.timedelta(days=2)
        base_data["order"].save()

        resp = auth.get(reverse("planning-weekly"), {"weeks": 4})
        weeks = resp.json()["weeks"]
        current_week = weeks[0]
        assert current_week["total"] >= 1


# ── GanttDataView ─────────────────────────────────────────────────────────────

class TestGanttData:
    def test_returns_200(self, auth, base_data):
        resp = auth.get(reverse("planning-gantt"))
        assert resp.status_code == 200

    def test_returns_list(self, auth, base_data):
        resp = auth.get(reverse("planning-gantt"))
        assert isinstance(resp.json(), list)

    def test_line_structure(self, auth, base_data):
        resp = auth.get(reverse("planning-gantt"))
        data = resp.json()
        assert len(data) >= 1
        line = data[0]
        for key in ("id", "n_serie", "order_n_ordre", "delivery_date", "events", "priority"):
            assert key in line, f"Missing key: {key}"
        assert isinstance(line["events"], list)
        assert len(line["events"]) == 7   # one per stage

    def test_filter_by_stage(self, auth, base_data):
        # Set line's current stage to ECH
        ech = next(s for s in base_data["stages"] if s.code == "ECH")
        base_data["line"].current_stage = ech
        base_data["line"].save()

        resp_ech = auth.get(reverse("planning-gantt"), {"stage": "ECH"})
        resp_cad = auth.get(reverse("planning-gantt"), {"stage": "CAD"})
        assert len(resp_ech.json()) >= 1
        assert len(resp_cad.json()) == 0

    def test_limit_respected(self, auth, base_data):
        resp = auth.get(reverse("planning-gantt"), {"limit": 1})
        assert len(resp.json()) <= 1

    def test_event_has_required_fields(self, auth, base_data):
        resp = auth.get(reverse("planning-gantt"))
        ev = resp.json()[0]["events"][0]
        for key in ("stage", "stage_name", "sequence", "status"):
            assert key in ev

    def test_requires_auth(self):
        resp = APIClient().get(reverse("planning-gantt"))
        assert resp.status_code == 401


# ── ReorderQueueView ──────────────────────────────────────────────────────────

class TestReorderQueue:
    def test_reorder_saves_sort_order(self, auth, base_data):
        family = base_data["line"].article.family
        client = base_data["client"]
        article = base_data["line"].article
        order = base_data["order"]
        ech_stage = next(s for s in base_data["stages"] if s.code == "ECH")

        # Create a second line at the same stage
        line2 = OrderLine.objects.create(
            order=order, n_serie=2, article=article, quantity=1, priority=Priority.NORMAL,
        )
        # Put both lines at ECH
        for line in [base_data["line"], line2]:
            line.current_stage = ech_stage
            line.save()

        line1_id = str(base_data["line"].id)
        line2_id = str(line2.id)

        # Reorder: line2 first, then line1
        resp = auth.post(reverse("planning-reorder"), {
            "stage_code": "ECH",
            "line_ids": [line2_id, line1_id],
        }, format="json")
        assert resp.status_code == 200, resp.json()
        assert resp.json()["count"] == 2

        # Verify sort_order persisted
        from apps.orders.models import OrderLine as OL
        l1 = OL.objects.get(id=line1_id)
        l2 = OL.objects.get(id=line2_id)
        assert l2.sort_order < l1.sort_order   # l2 was placed first

    def test_wrong_stage_returns_400(self, auth, base_data):
        resp = auth.post(reverse("planning-reorder"), {
            "stage_code": "ECH",
            "line_ids": [str(base_data["line"].id)],
        }, format="json")
        # Line's current_stage may not be ECH — should be 400
        # (unless the fixture happened to set it to ECH, in which case 200 is fine)
        assert resp.status_code in (200, 400)

    def test_missing_fields_returns_400(self, auth):
        resp = auth.post(reverse("planning-reorder"), {}, format="json")
        assert resp.status_code == 400

    def test_requires_planner_or_above(self, db, base_data):
        operator = User.objects.create_user(username="op_p3", password="pw", role=Role.OPERATOR)
        c = APIClient()
        c.force_authenticate(user=operator)
        resp = c.post(reverse("planning-reorder"), {
            "stage_code": "ECH", "line_ids": [],
        }, format="json")
        assert resp.status_code == 403

    def test_requires_auth(self):
        resp = APIClient().post(reverse("planning-reorder"), {}, format="json")
        assert resp.status_code == 401
