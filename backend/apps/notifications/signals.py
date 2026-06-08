"""
Notification signals:
- StageEvent DONE  → notify users whose role maps to the NEXT stage
- StageEvent BLOCKED → notify planners and admins
- OrderLine created → notify users at the first stage (ECH → planner)
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger("apps.notifications")

# Role that handles each stage code
STAGE_ROLE_MAP = {
    "ECH": "planner",
    "CAD": "designer",
    "CAM": "programmer",
    "CNC": "operator",
    "MTG": "assembly",
    "QF":  "qc",
    "AQC": "client",
}


def _create_for_role(role: str, level: str, message: str, link: str = "") -> None:
    from apps.accounts.models import User
    from apps.notifications.models import Notification

    users = User.objects.filter(role=role, is_active=True)
    notifs = [
        Notification(user=u, level=level, message=message, link=link)
        for u in users
    ]
    if notifs:
        Notification.objects.bulk_create(notifs)
        logger.info("Notified %d users (role=%s): %s", len(notifs), role, message)


def _connect_signals() -> None:
    from apps.production.models import StageEvent, StageEventStatus

    @receiver(post_save, sender=StageEvent)
    def on_stage_event_save(sender, instance: StageEvent, created: bool, **kwargs) -> None:
        if created:
            return

        if instance.status == StageEventStatus.DONE:
            # Notify users at the NEXT stage
            from apps.production.models import Stage
            next_stage = (
                Stage.objects.filter(
                    is_active=True,
                    sequence__gt=instance.stage.sequence,
                )
                .order_by("sequence")
                .first()
            )
            if next_stage and next_stage.code in STAGE_ROLE_MAP:
                role = STAGE_ROLE_MAP[next_stage.code]
                line = instance.line
                msg = (
                    f"Nouvelle pièce disponible pour {next_stage.name}: "
                    f"OP {line.order.n_ordre} / S{line.n_serie} "
                    f"({line.article.ref_client})"
                )
                link = f"/orders/{line.order_id}"
                _create_for_role(role, "info", msg, link)

        elif instance.status == StageEventStatus.BLOCKED:
            line = instance.line
            msg = (
                f"Blocage à l'étape {instance.stage.name}: "
                f"OP {line.order.n_ordre} / S{line.n_serie} "
                f"({line.article.ref_client})"
                + (f" — {instance.comment}" if instance.comment else "")
            )
            link = f"/orders/{line.order_id}"
            for role in ("planner", "admin"):
                _create_for_role(role, "warning", msg, link)
