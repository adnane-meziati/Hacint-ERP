import datetime

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order, OrderLine, OrderStatus, Priority
from apps.production.models import Stage, StageEvent


class OPDashboardView(APIView):
    """GET /api/dashboards/op/ — counters for the overview dashboard."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        today = timezone.localdate()

        total_orders = Order.objects.filter(deleted_at__isnull=True).count()
        total_lines = OrderLine.objects.filter(deleted_at__isnull=True).count()

        lines_en_cours = OrderLine.objects.filter(
            deleted_at__isnull=True, status=OrderStatus.EN_COURS
        ).count()
        lines_livree = OrderLine.objects.filter(
            deleted_at__isnull=True, status=OrderStatus.LIVREE
        ).count()
        lines_standby = OrderLine.objects.filter(
            deleted_at__isnull=True, status=OrderStatus.STANDBY
        ).count()

        lines_urgent = OrderLine.objects.filter(
            deleted_at__isnull=True,
            priority=Priority.URGENT,
            status=OrderStatus.EN_COURS,
        ).count()

        orders_late = Order.objects.filter(
            deleted_at__isnull=True,
            delivery_date__lt=today,
            status=OrderStatus.EN_COURS,
        ).count()

        lines_late = OrderLine.objects.filter(
            deleted_at__isnull=True,
            order__delivery_date__lt=today,
            status=OrderStatus.EN_COURS,
        ).count()

        stage_counts = (
            Stage.objects.filter(is_active=True)
            .annotate(
                active_lines=Count(
                    "current_lines",
                    filter=Q(
                        current_lines__deleted_at__isnull=True,
                        current_lines__status=OrderStatus.EN_COURS,
                    ),
                )
            )
            .values("code", "name", "sequence", "active_lines")
            .order_by("sequence")
        )

        return Response(
            {
                "total_orders": total_orders,
                "total_lines": total_lines,
                "lines_en_cours": lines_en_cours,
                "lines_livree": lines_livree,
                "lines_standby": lines_standby,
                "lines_urgent": lines_urgent,
                "orders_late": orders_late,
                "lines_late": lines_late,
                "stage_load": list(stage_counts),
            }
        )


class LoadDashboardView(APIView):
    """GET /api/dashboards/load/ — lines per stage (for load charts)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        stage_load = (
            Stage.objects.filter(is_active=True)
            .annotate(
                total=Count("current_lines", filter=Q(current_lines__deleted_at__isnull=True)),
                en_cours=Count(
                    "current_lines",
                    filter=Q(
                        current_lines__deleted_at__isnull=True,
                        current_lines__status=OrderStatus.EN_COURS,
                    ),
                ),
                urgent=Count(
                    "current_lines",
                    filter=Q(
                        current_lines__deleted_at__isnull=True,
                        current_lines__status=OrderStatus.EN_COURS,
                        current_lines__priority=Priority.URGENT,
                    ),
                ),
            )
            .values("code", "name", "sequence", "total", "en_cours", "urgent")
            .order_by("sequence")
        )
        return Response(list(stage_load))


class WeeklyCapacityView(APIView):
    """GET /api/planning/weekly/?weeks=4

    Returns per-week per-stage counts of active lines whose delivery_date
    falls in that week (upcoming workload forecast).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        try:
            weeks = max(1, min(int(request.query_params.get("weeks", 4)), 12))
        except (ValueError, TypeError):
            weeks = 4

        today = timezone.localdate()
        # Start from the beginning of the current ISO week (Monday)
        week_start = today - datetime.timedelta(days=today.weekday())

        stage_codes = list(
            Stage.objects.filter(is_active=True)
            .order_by("sequence")
            .values_list("code", flat=True)
        )

        result = []
        for w in range(weeks):
            start = week_start + datetime.timedelta(weeks=w)
            end = start + datetime.timedelta(days=6)

            week_lines = OrderLine.objects.filter(
                deleted_at__isnull=True,
                status=OrderStatus.EN_COURS,
                order__delivery_date__gte=start,
                order__delivery_date__lte=end,
            ).select_related("current_stage")

            counts: dict[str, int] = {code: 0 for code in stage_codes}
            no_stage = 0
            for line in week_lines:
                code = line.current_stage.code if line.current_stage else None
                if code and code in counts:
                    counts[code] += 1
                else:
                    no_stage += 1

            result.append(
                {
                    "week": start.strftime("%G-W%V"),
                    "label": f"{start.strftime('%d/%m')} – {end.strftime('%d/%m')}",
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    **counts,
                    "total": sum(counts.values()) + no_stage,
                }
            )

        return Response({"weeks": result, "stages": stage_codes})


class GanttDataView(APIView):
    """GET /api/planning/gantt/?stage=CNC&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50

    Returns order lines with their stage-event timeline for Gantt rendering.
    Filters to lines currently at the given stage (or all active lines if no stage given).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        qs = (
            OrderLine.objects.select_related(
                "order__client", "article", "current_stage"
            )
            .prefetch_related("events__stage", "events__completed_by")
            .filter(deleted_at__isnull=True, status=OrderStatus.EN_COURS)
        )

        stage_code = request.query_params.get("stage", "").upper()
        if stage_code:
            qs = qs.filter(current_stage__code=stage_code)

        from_date = request.query_params.get("from")
        to_date = request.query_params.get("to")
        if from_date:
            qs = qs.filter(order__delivery_date__gte=from_date)
        if to_date:
            qs = qs.filter(order__delivery_date__lte=to_date)

        try:
            limit = max(1, min(int(request.query_params.get("limit", 50)), 200))
        except (ValueError, TypeError):
            limit = 50

        qs = qs.order_by("sort_order", "order__n_ordre", "n_serie")[:limit]

        data = []
        for line in qs:
            events = []
            for ev in sorted(line.events.all(), key=lambda e: e.stage.sequence):
                events.append(
                    {
                        "stage": ev.stage.code,
                        "stage_name": ev.stage.name,
                        "sequence": ev.stage.sequence,
                        "status": ev.status,
                        "started_at": ev.started_at.isoformat() if ev.started_at else None,
                        "completed_at": ev.completed_at.isoformat() if ev.completed_at else None,
                        "completed_by": ev.completed_by.username if ev.completed_by else None,
                        "comment": ev.comment,
                    }
                )
            data.append(
                {
                    "id": str(line.id),
                    "n_serie": line.n_serie,
                    "order_n_ordre": line.order.n_ordre,
                    "order_id": str(line.order.id),
                    "client_code": line.order.client.code,
                    "article_ref": line.article.ref_client,
                    "article_desc": line.article.description,
                    "priority": line.priority,
                    "status": line.status,
                    "delivery_date": line.order.delivery_date.isoformat(),
                    "current_stage": line.current_stage.code if line.current_stage else None,
                    "sort_order": line.sort_order,
                    "events": events,
                }
            )

        return Response(data)
