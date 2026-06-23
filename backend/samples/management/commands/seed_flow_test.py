"""
Creates two test projects for the Production Flow dashboard:

  TEST_FLUX_COMPLET   — 5 samples, all 5 stages 100% done  → 100 %
  TEST_FLUX_EN_COURS  — 6 samples, designer+programmer done,
                        CNC in progress, assembly/quality not started → ~40 %

Usage (inside the running backend container):
  python manage.py seed_flow_test

To wipe the test data afterwards:
  python manage.py seed_flow_test --clear
"""

from datetime import date

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from samples.models import Sample


FINISHED = [
    {'apn': 'TF100010', 'placement': 'A1', 'fill': 'full',
     'designer_min': 45, 'programmer_min': 30, 'cnc_min': 60, 'assembly_min': 25, 'quality_min': 15},
    {'apn': 'TF200020', 'placement': 'A2', 'fill': 'full',
     'designer_min': 38, 'programmer_min': 22, 'cnc_min': 55, 'assembly_min': 20, 'quality_min': 12},
    {'apn': 'TF300030', 'placement': 'B1', 'fill': 'partial',
     'designer_min': 52, 'programmer_min': 35, 'cnc_min': 70, 'assembly_min': 30, 'quality_min': 18},
    {'apn': 'TF400040', 'placement': 'B2', 'fill': 'empty',
     'designer_min': 28, 'programmer_min': 18, 'cnc_min': 40, 'assembly_min': 15, 'quality_min': 10},
    {'apn': 'TF500050', 'placement': 'C1', 'fill': 'full',
     'designer_min': 61, 'programmer_min': 40, 'cnc_min': 80, 'assembly_min': 35, 'quality_min': 20},
]

IN_PROGRESS = [
    # designer ✓  programmer ✓  cnc ongoing  assembly —  quality —
    {'apn': 'TC100010', 'placement': 'A1', 'fill': 'full',
     'designer_min': 40, 'programmer_min': 25, 'cnc_min': 30, 'cnc_ongoing': True},
    {'apn': 'TC200020', 'placement': 'A2', 'fill': 'full',
     'designer_min': 35, 'programmer_min': 20, 'cnc_min': 0,  'cnc_ongoing': False},
    {'apn': 'TC300030', 'placement': 'B1', 'fill': 'partial',
     'designer_min': 50, 'programmer_min': 32, 'cnc_min': 45, 'cnc_ongoing': True},
    {'apn': 'TC400040', 'placement': 'B2', 'fill': 'empty',
     'designer_min': 30, 'programmer_min': 18, 'cnc_min': 0,  'cnc_ongoing': False},
    {'apn': 'TC500050', 'placement': 'C1', 'fill': 'full',
     'designer_min': 55, 'programmer_min': 38, 'cnc_min': 20, 'cnc_ongoing': True},
    {'apn': 'TC600060', 'placement': 'C2', 'fill': 'partial',
     'designer_min': 42, 'programmer_min': 28, 'cnc_min': 0,  'cnc_ongoing': False},
]

TEST_PROJECTS = ['TEST_FLUX_COMPLET', 'TEST_FLUX_EN_COURS']


class Command(BaseCommand):
    help = 'Seed two test projects for the Production Flow dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete the test projects instead of creating them',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted, _ = Sample.all_objects.filter(project__in=TEST_PROJECTS).delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} test samples.'))
            return

        admin = User.objects.filter(is_superuser=True).first()
        today = date.today()

        # ── 1. Finished project ────────────────────────────────────────────────
        created = 0
        for sd in FINISHED:
            if Sample.all_objects.filter(apn=sd['apn'], project='TEST_FLUX_COMPLET').exists():
                continue
            Sample.objects.create(
                apn=sd['apn'], project='TEST_FLUX_COMPLET',
                placement=sd['placement'], client='Aptiv',
                status='approved', quantity=1, connector_fill=sd['fill'],
                received_date=today,
                # Study
                study_approved=True,
                # Designer
                designer_status='done', is_done=True,
                done_date=today, done_by=admin,
                time_spent_minutes=sd['designer_min'],
                # Programmer
                programmer_status='done', programmer_done=True,
                programmer_done_date=today, programmer_done_by=admin,
                programmer_time_spent_minutes=sd['programmer_min'],
                # CNC
                cnc_status='done', cnc_done=True,
                cnc_done_date=today, cnc_done_by=admin,
                cnc_time_spent_minutes=sd['cnc_min'], cnc_produced_count=1,
                # Assembly
                assembly_status='done', assembly_done=True,
                assembly_done_date=today, assembly_done_by=admin,
                assembly_time_spent_minutes=sd['assembly_min'], assembly_produced_count=1,
                # Quality
                quality_status='done', quality_done=True,
                quality_done_date=today, quality_done_by=admin,
                quality_time_spent_minutes=sd['quality_min'],
                created_by=admin,
            )
            created += 1

        total_min = sum(
            sd['designer_min'] + sd['programmer_min'] + sd['cnc_min']
            + sd['assembly_min'] + sd['quality_min']
            for sd in FINISHED
        )
        self.stdout.write(self.style.SUCCESS(
            f'TEST_FLUX_COMPLET  → {created} samples créés | '
            f'temps total {total_min // 60}h {total_min % 60}min | 100 %'
        ))

        # ── 2. In-progress project ─────────────────────────────────────────────
        created = 0
        active = 0
        for sd in IN_PROGRESS:
            if Sample.all_objects.filter(apn=sd['apn'], project='TEST_FLUX_EN_COURS').exists():
                continue
            cnc_status = 'ongoing' if sd['cnc_ongoing'] else None
            if sd['cnc_ongoing']:
                active += 1
            Sample.objects.create(
                apn=sd['apn'], project='TEST_FLUX_EN_COURS',
                placement=sd['placement'], client='Yazaki',
                status='approved', quantity=1, connector_fill=sd['fill'],
                received_date=today,
                # Study
                study_approved=True,
                # Designer — all done
                designer_status='done', is_done=True,
                done_date=today, done_by=admin,
                time_spent_minutes=sd['designer_min'],
                # Programmer — all done
                programmer_status='done', programmer_done=True,
                programmer_done_date=today, programmer_done_by=admin,
                programmer_time_spent_minutes=sd['programmer_min'],
                # CNC — in progress (some ongoing, none marked done)
                cnc_status=cnc_status,
                cnc_time_spent_minutes=sd['cnc_min'],
                # Assembly & Quality — not started
                created_by=admin,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'TEST_FLUX_EN_COURS → {created} samples créés | '
            f'{active} CNC actifs | phase active : CNC | ~40 %'
        ))
        self.stdout.write('')
        self.stdout.write('Ouvrez le Flux de Production pour voir les résultats.')
