from django.apps import AppConfig


class ProductionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.production"
    label = "production"

    def ready(self) -> None:
        from apps.production.signals import _connect_signals

        _connect_signals()
