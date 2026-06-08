from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Looser password validation in dev
AUTH_PASSWORD_VALIDATORS = []

# Show SQL queries in dev logs
LOGGING["loggers"]["django.db.backends"] = {  # type: ignore[name-defined]  # noqa: F405
    "handlers": ["console"],
    "level": "DEBUG",
    "propagate": False,
}
