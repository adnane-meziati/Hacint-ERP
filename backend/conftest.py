import django
from django.conf import settings


def pytest_configure() -> None:
    settings.DATABASES["default"]["NAME"] = "megaindus_test"
