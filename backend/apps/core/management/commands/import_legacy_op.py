"""
Import legacy OP Excel tracking file into the database.
Usage:  python manage.py import_legacy_op <path_to_xlsx>
        make import FILE=Order_Traking_APTIV_HACINT_2026_V2.xlsx

The legacy file has:
  - Rows 1-5: title block (skipped)
  - Row 6:    header
  - Row 7+:   data rows

Column mapping (0-indexed after pandas read with header=5):
  A(0)  = n_ordre
  B(1)  = creation_date
  C(2)  = delivery_date
  D(3)  = n_serie
  E(4)  = client_code
  F(5)  = article_ref_client
  G(6)  = family_code
  H(7)  = article_description
  I(8)  = priority  (U/N/F)
  J(9)  = status    (EC/LI/SB)
  K(10) = ECH completed_date
  N(13) = CAD completed_date
  P(15) = CAM completed_date
  S(18) = CNC completed_date
  U(20) = MTG completed_date
  W(22) = QF  completed_date
  Y(24) = AQC completed_date
"""

from __future__ import annotations

from datetime import date
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Article, Client, Family
from apps.orders.models import Order, OrderLine, OrderStatus, Priority
from apps.production.models import Stage, StageEvent, StageEventStatus


PRIORITY_MAP = {
    "U": Priority.URGENT,
    "URGENT": Priority.URGENT,
    "N": Priority.NORMAL,
    "NORMAL": Priority.NORMAL,
    "F": Priority.FAIBLE,
    "FAIBLE": Priority.FAIBLE,
}

STATUS_MAP = {
    "EC": OrderStatus.EN_COURS,
    "EN_COURS": OrderStatus.EN_COURS,
    "EN COURS": OrderStatus.EN_COURS,
    "LI": OrderStatus.LIVREE,
    "LIVREE": OrderStatus.LIVREE,
    "LIVRÉ": OrderStatus.LIVREE,
    "SB": OrderStatus.STANDBY,
    "STANDBY": OrderStatus.STANDBY,
}

# (stage_code, pandas column index in the data row)
STAGE_DATE_COLS = [
    ("ECH", 10),
    ("CAD", 13),
    ("CAM", 15),
    ("CNC", 18),
    ("MTG", 20),
    ("QF",  22),
    ("AQC", 24),
]


def _to_str(val: Any, default: str = "") -> str:
    if val is None:
        return default
    s = str(val).strip()
    return s if s not in ("nan", "None", "") else default


def _to_int(val: Any) -> int | None:
    try:
        return int(float(str(val)))
    except (ValueError, TypeError):
        return None


def _to_date(val: Any) -> date | None:
    if val is None:
        return None
    import pandas as pd
    if isinstance(val, date):
        return val
    try:
        ts = pd.Timestamp(val)
        return ts.date() if not pd.isna(ts) else None
    except Exception:
        return None


class Command(BaseCommand):
    help = "Import legacy OP tracking Excel file (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("file", nargs="?", default="", help="Path to the .xlsx file")

    def handle(self, *args: object, **options: object) -> None:
        try:
            import pandas as pd
        except ImportError:
            raise CommandError("pandas is required: pip install pandas openpyxl")

        filepath = options.get("file") or ""
        if not filepath:
            raise CommandError("Provide the path to the xlsx file as argument.")

        self.stdout.write(f"Reading {filepath} …")
        try:
            df = pd.read_excel(filepath, sheet_name=0, header=5, dtype=str)
        except Exception as exc:
            raise CommandError(f"Cannot read file: {exc}")

        df = df.where(df.notna(), None)
        self.stdout.write(f"  {len(df)} rows, {len(df.columns)} columns detected.")

        stages_by_code: dict[str, Stage] = {s.code: s for s in Stage.objects.all()}
        missing = [c for c, _ in STAGE_DATE_COLS if c not in stages_by_code]
        if missing:
            raise CommandError(
                f"Stages not found in DB: {missing}. Run 'manage.py seed_demo' first."
            )

        counters = {
            "clients": 0, "families": 0, "articles": 0,
            "orders": 0, "lines": 0, "events_done": 0, "skipped": 0,
        }

        with transaction.atomic():
            for _idx, row in df.iterrows():
                row_vals = list(row)

                n_ordre = _to_int(row_vals[0] if len(row_vals) > 0 else None)
                if not n_ordre:
                    counters["skipped"] += 1
                    continue

                client_code = _to_str(row_vals[4] if len(row_vals) > 4 else None)
                article_ref = _to_str(row_vals[5] if len(row_vals) > 5 else None)
                family_code = _to_str(row_vals[6] if len(row_vals) > 6 else None)
                article_desc = _to_str(row_vals[7] if len(row_vals) > 7 else None, "Article")
                priority_raw = _to_str(row_vals[8] if len(row_vals) > 8 else None, "N").upper()
                status_raw = _to_str(row_vals[9] if len(row_vals) > 9 else None, "EC").upper()
                creation_raw = row_vals[1] if len(row_vals) > 1 else None
                delivery_raw = row_vals[2] if len(row_vals) > 2 else None
                n_serie = _to_int(row_vals[3] if len(row_vals) > 3 else None) or 1

                priority = PRIORITY_MAP.get(priority_raw, Priority.NORMAL)
                line_status = STATUS_MAP.get(status_raw, OrderStatus.EN_COURS)
                creation_date = _to_date(creation_raw) or date.today()
                delivery_date = _to_date(delivery_raw) or date.today()

                if not client_code:
                    counters["skipped"] += 1
                    continue

                client, created = Client.objects.get_or_create(
                    code=client_code, defaults={"name": client_code}
                )
                if created:
                    counters["clients"] += 1

                family_code = family_code or "AUTRE"
                family, created = Family.objects.get_or_create(
                    code=family_code, defaults={"name": family_code}
                )
                if created:
                    counters["families"] += 1

                if not article_ref:
                    counters["skipped"] += 1
                    continue

                art_defaults: dict = {"description": article_desc or article_ref, "family": family}
                article, created = Article.objects.get_or_create(
                    ref_client=article_ref, defaults=art_defaults
                )
                if created:
                    counters["articles"] += 1
                elif article_desc and article.description != article_desc:
                    article.description = article_desc
                    article.save(update_fields=["description"])

                order, created = Order.objects.get_or_create(
                    n_ordre=n_ordre,
                    defaults={
                        "client": client,
                        "creation_date": creation_date,
                        "delivery_date": delivery_date,
                        "status": OrderStatus.EN_COURS,
                    },
                )
                if created:
                    counters["orders"] += 1

                line, created = OrderLine.objects.get_or_create(
                    order=order,
                    n_serie=n_serie,
                    defaults={
                        "article": article,
                        "quantity": 1,
                        "priority": priority,
                        "status": line_status,
                    },
                )
                if not created:
                    changed = []
                    for field, val in [("priority", priority), ("status", line_status)]:
                        if getattr(line, field) != val:
                            setattr(line, field, val)
                            changed.append(field)
                    if changed:
                        line.save(update_fields=changed)
                else:
                    counters["lines"] += 1

                for stage_code, col_idx in STAGE_DATE_COLS:
                    if col_idx >= len(row_vals):
                        continue
                    done_date = _to_date(row_vals[col_idx])
                    if not done_date:
                        continue
                    stage = stages_by_code[stage_code]
                    ev, _ = StageEvent.objects.get_or_create(line=line, stage=stage)
                    if ev.status != StageEventStatus.DONE:
                        ev.status = StageEventStatus.DONE
                        naive_dt = timezone.datetime.combine(done_date, timezone.datetime.min.time())
                        ev.completed_at = timezone.make_aware(naive_dt)
                        if not ev.started_at:
                            ev.started_at = ev.completed_at
                        ev.save(update_fields=["status", "started_at", "completed_at"])
                        counters["events_done"] += 1

                # Rebuild current_stage: first non-DONE stage
                all_events = (
                    StageEvent.objects.filter(line=line)
                    .select_related("stage")
                    .order_by("stage__sequence")
                )
                current = None
                for ev in all_events:
                    if ev.status != StageEventStatus.DONE:
                        current = ev.stage
                        break
                if line.current_stage_id != (current.pk if current else None):
                    line.current_stage = current
                    if current is None:
                        line.status = OrderStatus.LIVREE
                    line.save(update_fields=["current_stage", "status"])

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Import complete:\n"
            f"  Clients:     {counters['clients']}\n"
            f"  Families:    {counters['families']}\n"
            f"  Articles:    {counters['articles']}\n"
            f"  Orders:      {counters['orders']}\n"
            f"  Lines:       {counters['lines']}\n"
            f"  Events DONE: {counters['events_done']}\n"
            f"  Skipped:     {counters['skipped']}\n"
        ))
