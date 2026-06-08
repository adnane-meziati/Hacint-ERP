from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.audit"
    label = "audit"

    def ready(self) -> None:
        from apps.audit.signals import _connect_audit

        # Connect audit logging for key domain models
        from apps.catalog.models import Article
        from apps.orders.models import Order, OrderLine
        from apps.production.models import StageEvent

        for model in (Order, OrderLine, StageEvent, Article):
            _connect_audit(model)
