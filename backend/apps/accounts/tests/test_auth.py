import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Role, User


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def admin_user(db: None) -> User:
    return User.objects.create_user(
        username="admin_test",
        password="AdminPass1234!",
        role=Role.ADMIN,
        email="admin@test.com",
    )


@pytest.fixture
def regular_user(db: None) -> User:
    return User.objects.create_user(
        username="operator_test",
        password="OperPass1234!",
        role=Role.OPERATOR,
        email="operator@test.com",
    )


@pytest.mark.django_db
class TestLogin:
    def test_login_returns_tokens(self, api_client: APIClient, admin_user: User) -> None:
        resp = api_client.post(
            reverse("token_obtain_pair"),
            {"username": "admin_test", "password": "AdminPass1234!"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_wrong_password(self, api_client: APIClient, admin_user: User) -> None:
        resp = api_client.post(
            reverse("token_obtain_pair"),
            {"username": "admin_test", "password": "wrong"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_unknown_user(self, api_client: APIClient) -> None:
        resp = api_client.post(
            reverse("token_obtain_pair"),
            {"username": "nobody", "password": "whatever"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefresh:
    def test_refresh_returns_new_access(self, api_client: APIClient, admin_user: User) -> None:
        login = api_client.post(
            reverse("token_obtain_pair"),
            {"username": "admin_test", "password": "AdminPass1234!"},
        )
        refresh = login.data["refresh"]
        resp = api_client.post(reverse("token_refresh"), {"refresh": refresh})
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data

    def test_refresh_with_invalid_token(self, api_client: APIClient) -> None:
        resp = api_client.post(reverse("token_refresh"), {"refresh": "bad.token.here"})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMe:
    def _auth(self, client: APIClient, user: User, password: str) -> None:
        resp = client.post(
            reverse("token_obtain_pair"),
            {"username": user.username, "password": password},
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def test_me_returns_user_data(self, api_client: APIClient, admin_user: User) -> None:
        self._auth(api_client, admin_user, "AdminPass1234!")
        resp = api_client.get(reverse("users-me"))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["username"] == "admin_test"
        assert resp.data["role"] == Role.ADMIN

    def test_me_requires_auth(self, api_client: APIClient) -> None:
        resp = api_client.get(reverse("users-me"))
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_patch_updates_profile(self, api_client: APIClient, admin_user: User) -> None:
        self._auth(api_client, admin_user, "AdminPass1234!")
        resp = api_client.patch(reverse("users-me"), {"first_name": "Adnane"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["first_name"] == "Adnane"


@pytest.mark.django_db
class TestUserList:
    def _auth(self, client: APIClient, user: User, password: str) -> None:
        resp = client.post(
            reverse("token_obtain_pair"),
            {"username": user.username, "password": password},
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def test_admin_can_list_users(self, api_client: APIClient, admin_user: User) -> None:
        self._auth(api_client, admin_user, "AdminPass1234!")
        resp = api_client.get(reverse("users-list"))
        assert resp.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_list_users(
        self, api_client: APIClient, regular_user: User
    ) -> None:
        self._auth(api_client, regular_user, "OperPass1234!")
        resp = api_client.get(reverse("users-list"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestLogout:
    def test_logout_blacklists_refresh(self, api_client: APIClient, admin_user: User) -> None:
        login = api_client.post(
            reverse("token_obtain_pair"),
            {"username": "admin_test", "password": "AdminPass1234!"},
        )
        access = login.data["access"]
        refresh = login.data["refresh"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.post(reverse("auth-logout"), {"refresh": refresh})
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        # Blacklisted token cannot refresh anymore
        resp2 = api_client.post(reverse("token_refresh"), {"refresh": refresh})
        assert resp2.status_code == status.HTTP_401_UNAUTHORIZED
