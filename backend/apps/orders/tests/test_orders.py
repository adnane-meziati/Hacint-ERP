import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Article, Client, Family
from apps.orders.models import Order, OrderLine, OrderStatus, Priority
from apps.production.models import Stage, StageEvent


@pytest.fixture
def planner(db):
    return User.objects.create_user(username="planner", password="pw", role=Role.PLANNER)


@pytest.fixture
def planner_client(planner):
    c = APIClient()
    c.force_authenticate(user=planner)
    return c


@pytest.fixture
def family(db):
    return Family.objects.create(code="KIT", name="Kit")


@pytest.fixture
def aptiv(db):
    return Client.objects.create(code="APTIV", name="APTIV Morocco")


@pytest.fixture
def article(db, family):
    return Article.objects.create(ref_client="ART-001", description="Article 1", family=family)


@pytest.fixture
def stages(db):
    codes = ["ECH", "CAD", "CAM", "CNC", "MTG", "QF", "AQC"]
    return [Stage.objects.create(code=c, name=c, sequence=i + 1) for i, c in enumerate(codes)]


@pytest.fixture
def order(db, aptiv):
    return Order.objects.create(
        n_ordre=1001,
        client=aptiv,
        creation_date="2026-01-01",
        delivery_date="2026-02-01",
    )


class TestOrderCreate:
    def test_create_order_with_lines(self, planner_client, aptiv, article, stages):
        url = reverse("orders-list")
        payload = {
            "n_ordre": 2001,
            "client": str(aptiv.pk),
            "creation_date": "2026-01-10",
            "delivery_date": "2026-03-01",
            "notes": "",
            "lines": [
                {"n_serie": 1, "article": str(article.pk), "quantity": 1, "priority": "normal"},
            ],
        }
        resp = planner_client.post(url, payload, format="json")
        assert resp.status_code == 201
        order = Order.objects.get(n_ordre=2001)
        assert order.lines.count() == 1
        line = order.lines.first()
        assert StageEvent.objects.filter(line=line).count() == len(stages)

    def test_stage_events_auto_created(self, planner_client, aptiv, article, stages):
        url = reverse("orders-list")
        payload = {
            "n_ordre": 3001,
            "client": str(aptiv.pk),
            "creation_date": "2026-01-10",
            "delivery_date": "2026-03-01",
            "lines": [
                {"n_serie": 1, "article": str(article.pk), "quantity": 1, "priority": "urgent"},
            ],
        }
        planner_client.post(url, payload, format="json")
        line = OrderLine.objects.get(order__n_ordre=3001, n_serie=1)
        assert line.current_stage is not None
        assert line.current_stage.code == "ECH"
        assert StageEvent.objects.filter(line=line).count() == 7

    def test_order_list_filter_by_status(self, planner_client, order):
        url = reverse("orders-list") + "?status=en_cours"
        resp = planner_client.get(url)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_order_detail(self, planner_client, order):
        url = reverse("orders-detail", kwargs={"pk": order.pk})
        resp = planner_client.get(url)
        assert resp.status_code == 200
        assert resp.data["n_ordre"] == 1001


class TestOrderLineStatus:
    def test_line_becomes_livree_when_all_stages_done(self, db, aptiv, article, stages):
        order = Order.objects.create(
            n_ordre=4001, client=aptiv,
            creation_date="2026-01-01", delivery_date="2026-02-01"
        )
        line = OrderLine.objects.create(
            order=order, n_serie=1, article=article, quantity=1
        )
        for ev in StageEvent.objects.filter(line=line):
            ev.status = "done"
            ev.save()
        line.refresh_from_db()
        assert line.status == OrderStatus.LIVREE
        assert line.current_stage is None
