from django.db.models.signals import post_save
from django.dispatch import receiver


def _connect_signals() -> None:
    from apps.workflow.models import Apn, ApnStageHistory

    @receiver(post_save, sender=Apn, dispatch_uid="wf_create_stage_history_on_create")
    def create_initial_stage_history(
        sender: type, instance: Apn, created: bool, **kwargs: object
    ) -> None:
        """Record the initial stage entry when an APN is first created."""
        if not created:
            return
        ApnStageHistory.objects.create(
            apn=instance,
            from_stage=None,
            to_stage=instance.current_stage,
            transitioned_by=instance.created_by,
            comment="APN créé",
        )
