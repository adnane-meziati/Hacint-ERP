from django.db.models.signals import post_save
from django.dispatch import receiver


def _connect_signals() -> None:
    from apps.orders.models import OrderLine, OrderStatus
    from apps.production.models import Stage, StageEvent, StageEventStatus

    @receiver(post_save, sender=OrderLine, dispatch_uid="create_stage_events_on_line")
    def create_stage_events(
        sender: type, instance: OrderLine, created: bool, **kwargs: object
    ) -> None:
        if not created:
            return
        for stage in Stage.objects.filter(is_active=True).order_by("sequence"):
            StageEvent.objects.get_or_create(line=instance, stage=stage)
        first = Stage.objects.filter(is_active=True).order_by("sequence").first()
        if first:
            OrderLine.objects.filter(pk=instance.pk).update(current_stage=first)

    @receiver(post_save, sender=StageEvent, dispatch_uid="advance_stage_on_done")
    def advance_current_stage(
        sender: type, instance: StageEvent, **kwargs: object
    ) -> None:
        if instance.status != StageEventStatus.DONE:
            return
        next_stage = (
            Stage.objects.filter(
                is_active=True, sequence__gt=instance.stage.sequence
            )
            .order_by("sequence")
            .first()
        )
        line = instance.line
        line.current_stage = next_stage
        if next_stage is None:
            line.status = OrderStatus.LIVREE
        line.save(update_fields=["current_stage", "status", "updated_at"])
