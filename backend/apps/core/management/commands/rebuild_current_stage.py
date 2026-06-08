"""
Rebuild current_stage for all OrderLines.
Usage:  python manage.py rebuild_current_stage

Sets each line's current_stage to the first StageEvent that is not DONE.
Run after bulk imports or manual stage corrections.
"""

from django.core.management.base import BaseCommand

from apps.orders.models import OrderLine, OrderStatus
from apps.production.models import StageEvent, StageEventStatus


class Command(BaseCommand):
    help = "Recompute OrderLine.current_stage for all active lines."

    def handle(self, *args: object, **options: object) -> None:
        lines = OrderLine.objects.filter(deleted_at__isnull=True).select_related("current_stage")
        updated = 0

        for line in lines:
            first_pending = (
                StageEvent.objects.filter(line=line)
                .exclude(status=StageEventStatus.DONE)
                .select_related("stage")
                .order_by("stage__sequence")
                .first()
            )
            correct_stage = first_pending.stage if first_pending else None
            correct_status = OrderStatus.EN_COURS if correct_stage else OrderStatus.LIVREE

            changed = False
            if line.current_stage != correct_stage:
                line.current_stage = correct_stage
                changed = True
            if correct_stage is None and line.status != OrderStatus.LIVREE:
                line.status = correct_status
                changed = True

            if changed:
                line.save(update_fields=["current_stage", "status"])
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"✓ rebuild_current_stage: {updated} lines updated out of {lines.count()} total."
        ))
