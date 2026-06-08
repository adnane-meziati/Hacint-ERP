import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Article, Client, Family
from apps.orders.models import Order, OrderLine, OrderStatus
from apps.production.models import Stage, StageEvent, StageEventStatus


@pytest.fixture
def operator(db):
    return User.objects.create_user(username="op1", password="pw", role=Role.OPERATOR)


@pytest.fixture
def op_client(operator):
    c = APIClient()
    c.force_authenticate(user=operator)
    return c


@pytest.fixture
def line_with_stages(db):
    family = Family.objects.create(code="KIT2", name="Kit")
    client = Client.objects.create(code="CLI2", name="Client 2")
    article = Article.objects.create(ref_client="REF-002", description="Article 2", family=family)
    stages = [Stage.objects.create(code=c, name=c, sequence=i + 1)
              for i, c in enumerate(["ECH", "CAD", "CAM", "CNC", "MTG", "QF", "AQC"])]
    order = Order.objects.create(
        n_ordre=5001, client=client,
        creation_date="2026-01-01", delivery_date="2026-02-01"
    )
    line = OrderLine.objects.create(
        order=order, n_serie=1, article=article, quantity=1
    )
    return line, stages


class TestStageActions:
    def test_start_stage(self, op_client, line_with_stages):
        line, stages = line_with_stages
        url = reverse("stage-start", kwargs={"pk": line.pk, "code": "ECH"})
        resp = op_client.post(url)
        assert resp.status_code == 200
        ev = StageEvent.objects.get(line=line, stage__code="ECH")
        assert ev.status == StageEventStatus.IN_PROGRESS
        assert ev.started_at is not None

    def test_complete_stage_advances_current(self, op_client, line_with_stages):
        line, stages = line_with_stages
        url = reverse("stage-complete", kwargs={"pk": line.pk, "code": "ECH"})
        resp = op_client.post(url, {"comment": "Done OK"}, format="json")
        assert resp.status_code == 200
        line.refresh_from_db()
        assert line.current_stage.code == "CAD"

    def test_block_stage(self, op_client, line_with_stages):
        line, stages = line_with_stages
        url = reverse("stage-block", kwargs={"pk": line.pk, "code": "ECH"})
        resp = op_client.post(url, {"comment": "Missing drawing"}, format="json")
        assert resp.status_code == 200
        ev = StageEvent.objects.get(line=line, stage__code="ECH")
        assert ev.status == StageEventStatus.BLOCKED
        assert ev.comment == "Missing drawing"

    def test_complete_all_stages_marks_line_livree(self, op_client, line_with_stages):
        line, stages = line_with_stages
        stage_codes = ["ECH", "CAD", "CAM", "CNC", "MTG", "QF", "AQC"]
        for code in stage_codes:
            op_client.post(
                reverse("stage-complete", kwargs={"pk": line.pk, "code": code}),
                format="json",
            )
        line.refresh_from_db()
        assert line.status == OrderStatus.LIVREE
        assert line.current_stage is None

    def test_queue_view(self, op_client, line_with_stages):
        line, stages = line_with_stages
        url = reverse("queue-detail", kwargs={"stage_code": "ECH"})
        resp = op_client.get(url)
        assert resp.status_code == 200
        assert len(resp.data) >= 1

    def test_cannot_complete_done_stage_again(self, op_client, line_with_stages):
        line, stages = line_with_stages
        complete_url = reverse("stage-complete", kwargs={"pk": line.pk, "code": "ECH"})
        op_client.post(complete_url)
        resp = op_client.post(complete_url)
        assert resp.status_code == 409
