from django.apps import AppConfig


class WorkflowConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.workflow"
    label = "workflow"

    def ready(self) -> None:
        from apps.workflow.signals import _connect_signals

        _connect_signals()
