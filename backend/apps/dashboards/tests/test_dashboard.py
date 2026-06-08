import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Article, Client, Family
from apps.orders.models import Order, OrderLine, OrderStatus, Priority
from apps.production.models import Stage


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username="dash_admin", password="pw", role=Role.ADMIN)


@pytest.fixture
def auth_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def seeded_data(db):
    family = Family.objects.create(code="KIT3", name="Kit")
    client = Client.objects.create(code="CLI3", name="Client 3")
    article = Article.objects.create(ref_client="REF-003", description="A3", family=family)
    stages = [Stage.objects.create(code=c, name=c, sequence=i + 1)
              for i, c in enumerate(["ECH", "CAD", "CAM", "CNC", "MTG", "QF", "AQC"])]
    order = Order.objects.create(
        n_ordre=6001, client=client,
        creation_date="2026-01-01", delivery_date="2026-01-31"
    )
    line1 = OrderLine.objects.create(
        order=order, n_serie=1, article=article, quantity=1, priority=Priority.URGENT
    )
    line2 = OrderLine.objects.create(
        order=order, n_serie=2, article=article, quantity=1, priority=Priority.NORMAL
    )
    return {"order": order, "lines": [line1, line2], "stages": stages}


class TestOPDashboard:
    def test_returns_200(self, auth_client):
        url = reverse("dashboard-op")
        resp = auth_client.get(url)
        assert resp.status_code == 200

    def test_counters_match_seeded_data(self, auth_client, seeded_data):
        url = reverse("dashboard-op")
        resp = auth_client.get(url)
        data = resp.json()
        assert data["total_orders"] >= 1
        assert data["total_lines"] >= 2
        assert data["lines_urgent"] >= 1
        assert "stage_load" in data
        assert len(data["stage_load"]) == 7

    def test_load_dashboard(self, auth_client, seeded_data):
        url = reverse("dashboard-load")
        resp = auth_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 7
