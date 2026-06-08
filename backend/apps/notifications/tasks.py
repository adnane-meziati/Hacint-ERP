"""Celery tasks for notifications."""

import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("apps.notifications")


@shared_task(name="apps.notifications.tasks.notify_late_lines")
def notify_late_lines() -> dict:
    """Daily task: notify planners about lines past their delivery date."""
    from apps.accounts.models import User
    from apps.notifications.models import Notification, NotificationLevel
    from apps.orders.models import OrderLine, OrderStatus

    today = timezone.localdate()
    late_lines = OrderLine.objects.filter(
        deleted_at__isnull=True,
        status=OrderStatus.EN_COURS,
        order__delivery_date__lt=today,
    ).select_related("order__client", "article").order_by("order__delivery_date")

    if not late_lines.exists():
        logger.info("notify_late_lines: no late lines today")
        return {"notified": 0}

    planners = User.objects.filter(role__in=("planner", "admin"), is_active=True)
    count = late_lines.count()
    created = 0
    for planner in planners:
        # Skip if we already sent today
        already_sent = Notification.objects.filter(
            user=planner,
            level=NotificationLevel.ERROR,
            created_at__date=today,
            message__startswith="Lignes en retard",
        ).exists()
        if already_sent:
            continue

        top = ", ".join(
            f"OP{l.order.n_ordre}/S{l.n_serie}" for l in late_lines[:5]
        )
        suffix = f" (+{count - 5} autres)" if count > 5 else ""
        Notification.objects.create(
            user=planner,
            level=NotificationLevel.ERROR,
            message=f"Lignes en retard ({count}): {top}{suffix}",
            link="/orders?status=en_cours",
        )
        created += 1

    logger.info("notify_late_lines: %d late lines, notified %d planners", count, created)
    return {"late_lines": count, "notified": created}
