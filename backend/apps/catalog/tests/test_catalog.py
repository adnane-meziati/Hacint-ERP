import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Article, Client, Family


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(username="a_admin", password="pw", role=Role.ADMIN)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def readonly_client(db):
    user = User.objects.create_user(username="a_client", password="pw", role=Role.CLIENT)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def family(db):
    return Family.objects.create(code="KIT", name="Kit")


@pytest.fixture
def aptiv(db):
    return Client.objects.create(code="APTIV", name="APTIV Morocco")


@pytest.fixture
def article(db, family):
    return Article.objects.create(ref_client="ART-001", description="Test article", family=family)


class TestClientAPI:
    def test_list_clients(self, admin_client, aptiv):
        url = reverse("clients-list")
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_create_client(self, admin_client):
        url = reverse("clients-list")
        resp = admin_client.post(url, {"code": "FORD", "name": "Ford Morocco"})
        assert resp.status_code == 201
        assert Client.objects.filter(code="FORD").exists()

    def test_readonly_cannot_create(self, readonly_client):
        url = reverse("clients-list")
        resp = readonly_client.post(url, {"code": "BMW", "name": "BMW"})
        assert resp.status_code == 403


class TestFamilyAPI:
    def test_list_families(self, admin_client, family):
        url = reverse("families-list")
        resp = admin_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert any(f["code"] == "KIT" for f in data)


class TestArticleAPI:
    def test_list_articles(self, admin_client, article):
        url = reverse("articles-list")
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_search_by_ref(self, admin_client, article):
        url = reverse("articles-list") + "?search=ART-001"
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_filter_by_family(self, admin_client, article):
        url = reverse("articles-list") + "?family=KIT"
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_filter_excludes_deleted(self, admin_client, article):
        from django.utils import timezone
        article.deleted_at = timezone.now()
        article.save(update_fields=["deleted_at"])
        url = reverse("articles-list")
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_article_detail(self, admin_client, article):
        url = reverse("articles-detail", kwargs={"pk": article.pk})
        resp = admin_client.get(url)
        assert resp.status_code == 200
        assert resp.data["ref_client"] == "ART-001"
