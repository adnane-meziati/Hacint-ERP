import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hacint.settings.dev")

app = Celery("hacint")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
