#!/usr/bin/env python
"""
Seed script — données de démonstration pour le module RH.
Run with: python seed_hr.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from hr.models import (
    Department, Employee, Contract, Resignation, PayrollRecord,
    LeaveRequest, Attendance, JobPosition, Candidate, Application, Interview,
)

admin = User.objects.filter(is_superuser=True).first()
today = date.today()

# ── 1. Départements ────────────────────────────────────────────────────────
print("Départements...")
DEPARTMENTS = [
    ('Production', "Atelier de production — découpe, sertissage, assemblage"),
    ('Qualité', 'Contrôle qualité et validation des échantillons'),
    ('Ressources Humaines', 'Gestion du personnel, paie, recrutement'),
    ('Logistique', 'Transport, livraisons, gestion des entrepôts'),
    ('Maintenance', 'Entretien des machines et équipements'),
    ('Administration & Finance', 'Comptabilité, achats, administration générale'),
]
depts = {}
for name, desc in DEPARTMENTS:
    d, _ = Department.objects.get_or_create(name=name, defaults={'description': desc})
    depts[name] = d
print(f"  {len(depts)} départements")

# ── 2. Employés ────────────────────────────────────────────────────────────
print("Employés...")
EMPLOYEES = [
    ('EMP-0001', 'Karim', 'El Idrissi', 'BE123456', date(1985, 3, 14), 'M',
     '0661-110011', 'karim.elidrissi@hacint.local', "Chef d'atelier Production",
     'Production', date(2015, 4, 1), 'active'),
    ('EMP-0002', 'Fatima Zahra', 'Bennani', 'BE234567', date(1992, 7, 22), 'F',
     '0662-110022', 'fz.bennani@hacint.local', 'Opératrice CNC',
     'Production', date(2018, 9, 10), 'active'),
    ('EMP-0003', 'Youssef', 'Amrani', 'BE345678', date(1990, 1, 5), 'M',
     '0663-110033', 'youssef.amrani@hacint.local', 'Technicien Qualité',
     'Qualité', date(2017, 2, 15), 'active'),
    ('EMP-0004', 'Sara', 'Tazi', 'BE456789', date(1988, 11, 30), 'F',
     '0664-110044', 'sara.tazi@hacint.local', 'Responsable RH',
     'Ressources Humaines', date(2016, 6, 1), 'active'),
    ('EMP-0005', 'Mohamed', 'Chraibi', 'BE567890', date(1983, 5, 18), 'M',
     '0665-110055', 'mohamed.chraibi@hacint.local', 'Chauffeur Poids Lourd',
     'Logistique', date(2014, 3, 20), 'active'),
    ('EMP-0006', 'Hicham', 'Ouazzani', 'BE678901', date(1991, 9, 9), 'M',
     '0666-110066', 'hicham.ouazzani@hacint.local', 'Chauffeur Livraison',
     'Logistique', date(2019, 1, 12), 'active'),
    ('EMP-0007', 'Nadia', 'Lahlou', 'BE789012', date(1995, 2, 27), 'F',
     '0667-110077', 'nadia.lahlou@hacint.local', 'Magasinière',
     'Logistique', date(2020, 10, 5), 'active'),
    ('EMP-0008', 'Rachid', 'Bensouda', 'BE890123', date(1980, 12, 3), 'M',
     '0668-110088', 'rachid.bensouda@hacint.local', 'Technicien Maintenance',
     'Maintenance', date(2012, 7, 1), 'active'),
    ('EMP-0009', 'Amina', 'Sefrioui', 'BE901234', date(1993, 4, 16), 'F',
     '0669-110099', 'amina.sefrioui@hacint.local', 'Comptable',
     'Administration & Finance', date(2021, 1, 11), 'active'),
    ('EMP-0010', 'Omar', 'Fassi', 'BE012345', date(1996, 8, 8), 'M',
     '0660-110000', 'omar.fassi@hacint.local', 'Assembleur',
     'Production', date(2022, 3, 1), 'active'),
    ('EMP-0011', 'Khadija', 'Berrada', 'BE123457', date(1994, 6, 25), 'F',
     '0661-110012', 'khadija.berrada@hacint.local', 'Dessinatrice / Designer',
     'Production', date(2021, 9, 1), 'on_leave'),
    ('EMP-0012', 'Anas', 'Idrissi', 'BE234568', date(1987, 10, 19), 'M',
     '0662-110023', 'anas.idrissi@hacint.local', 'Responsable Logistique',
     'Logistique', date(2015, 11, 16), 'active'),
]
emps = {}
for num, fn, ln, cin, dob, gender, phone, email, position, dept, hire, status in EMPLOYEES:
    e, _ = Employee.objects.get_or_create(
        employee_number=num,
        defaults=dict(
            first_name=fn, last_name=ln, cin=cin, date_of_birth=dob, gender=gender,
            phone_number=phone, email=email, address='Tanger, Maroc',
            emergency_contact='Contact urgence — 0600-000000',
            hire_date=hire, shift_start=time(8, 0), shift_end=time(17, 0),
            position=position, department=depts[dept], status=status,
        ),
    )
    emps[num] = e
print(f"  {len(emps)} employés")

# Managers de département
MANAGERS = {
    'Production': 'EMP-0001',
    'Qualité': 'EMP-0003',
    'Ressources Humaines': 'EMP-0004',
    'Logistique': 'EMP-0012',
    'Maintenance': 'EMP-0008',
    'Administration & Finance': 'EMP-0009',
}
for dept_name, emp_num in MANAGERS.items():
    depts[dept_name].manager = emps[emp_num]
    depts[dept_name].save(update_fields=['manager'])

# ── 3. Contrats ────────────────────────────────────────────────────────────
print("Contrats...")
CONTRACTS = [
    ('EMP-0001', 'cdi', date(2015, 4, 1), None, '12000.00', 'active', ''),
    ('EMP-0002', 'cdi', date(2018, 9, 10), None, '6500.00', 'active', ''),
    ('EMP-0003', 'cdi', date(2017, 2, 15), None, '7800.00', 'active', ''),
    ('EMP-0004', 'cdi', date(2016, 6, 1), None, '9500.00', 'active', ''),
    ('EMP-0005', 'cdi', date(2014, 3, 20), None, '6000.00', 'active', ''),
    ('EMP-0006', 'cdd', date(2019, 1, 12), date(2026, 12, 31), '5200.00', 'active', 'CDD 1 an renouvelable'),
    ('EMP-0007', 'cdi', date(2020, 10, 5), None, '4800.00', 'active', ''),
    ('EMP-0008', 'cdi', date(2012, 7, 1), None, '8200.00', 'active', ''),
    ('EMP-0009', 'cdi', date(2021, 1, 11), None, '7200.00', 'active', ''),
    ('EMP-0010', 'anapec', date(2022, 3, 1), date(2026, 3, 1), '4200.00', 'active', 'Contrat ANAPEC'),
    ('EMP-0011', 'cdi', date(2021, 9, 1), None, '6800.00', 'active', ''),
    ('EMP-0012', 'cdi', date(2015, 11, 16), None, '9000.00', 'active', ''),
    ('EMP-0005', 'cdd', date(2013, 1, 1), date(2014, 3, 19), '4500.00', 'expired', "Période d'essai avant CDI"),
]
for num, ctype, start, end, salary, status, notes in CONTRACTS:
    Contract.objects.get_or_create(
        employee=emps[num], contract_type=ctype, start_date=start,
        defaults=dict(end_date=end, base_salary=Decimal(salary), status=status, notes=notes),
    )
print(f"  {Contract.objects.count()} contrats")

# ── 4. Demandes de congé ──────────────────────────────────────────────────────
print("Demandes de congé...")
LEAVES = [
    ('EMP-0002', 'paid', date(2026, 7, 1), date(2026, 7, 14), 14, 'Congé annuel été', 'approved'),
    ('EMP-0005', 'sick', date(2026, 5, 20), date(2026, 5, 22), 3, 'Grippe', 'approved'),
    ('EMP-0011', 'unpaid', date(2026, 6, 1), date(2026, 8, 31), 92, 'Congé maternité prolongé', 'approved'),
    ('EMP-0010', 'paid', date(2026, 6, 20), date(2026, 6, 27), 8, 'Mariage', 'pending'),
    ('EMP-0007', 'exceptional', date(2026, 6, 15), date(2026, 6, 16), 2, 'Décès dans la famille', 'pending'),
    ('EMP-0003', 'paid', date(2026, 4, 10), date(2026, 4, 17), 8, 'Congé annuel printemps', 'rejected'),
]
for num, ltype, start, end, days, reason, status in LEAVES:
    extra = {}
    if status in ('approved', 'rejected'):
        extra['approved_by'] = admin
        extra['approval_date'] = datetime.combine(start - timedelta(days=2), time(9, 0))
        extra['approval_comment'] = 'Validé RH' if status == 'approved' else 'Période de forte activité — refusé'
    LeaveRequest.objects.get_or_create(
        employee=emps[num], leave_type=ltype, start_date=start, end_date=end,
        defaults=dict(number_of_days=days, reason=reason, status=status, **extra),
    )
print(f"  {LeaveRequest.objects.count()} demandes de congé")

# ── 5. Pointage ────────────────────────────────────────────────────────────
print("Pointage...")
def last_weekdays(n, from_date):
    days = []
    d = from_date
    while len(days) < n:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            days.append(d)
    return list(reversed(days))

work_days = last_weekdays(5, today)
for num, emp in emps.items():
    if num == 'EMP-0011':  # en congé maternité
        continue
    for i, d in enumerate(work_days):
        status, check_in, check_out = 'present', time(8, 0), time(17, 0)
        worked, overtime = Decimal('8.00'), Decimal('0.00')
        if num == 'EMP-0006' and i == 2:
            status, check_in, worked = 'late', time(9, 15), Decimal('6.75')
        if num == 'EMP-0005' and i == 1:
            check_in, check_out, worked, overtime = time(7, 30), time(19, 0), Decimal('10.50'), Decimal('2.50')
        if num == 'EMP-0007' and i == 4:
            status, check_in, check_out, worked = 'absent', None, None, Decimal('0.00')
        Attendance.objects.get_or_create(
            employee=emp, date=d,
            defaults=dict(check_in=check_in, check_out=check_out, worked_hours=worked,
                           overtime_hours=overtime, status=status),
        )
print(f"  {Attendance.objects.count()} pointages")

# ── 6. Paie ───────────────────────────────────────────────────────────────────
print("Paie...")
def month_year_minus(n):
    m = today.month - n
    y = today.year
    while m <= 0:
        m += 12
        y -= 1
    return m, y

for offset, status in [(2, 'paid'), (1, 'validated')]:
    month, year = month_year_minus(offset)
    for num, emp in emps.items():
        contract = emp.contracts.filter(status='active').order_by('-start_date').first()
        base = contract.base_salary if contract else Decimal('4000.00')
        bonuses = Decimal('1000.00') if num == 'EMP-0001' else Decimal('0.00')
        overtime = Decimal('450.00') if num == 'EMP-0005' else Decimal('0.00')
        deductions = base if num == 'EMP-0011' else Decimal('0.00')
        PayrollRecord.objects.get_or_create(
            employee=emp, month=month, year=year,
            defaults=dict(base_salary=base, overtime_amount=overtime, bonuses=bonuses,
                           deductions=deductions, status=status),
        )
print(f"  {PayrollRecord.objects.count()} bulletins de paie")

# ── 7. Postes ouverts ──────────────────────────────────────────────────────
print("Postes ouverts...")
JOBS = [
    ('Opérateur CNC', 'Production',
     'Opérer et régler les machines CNC, contrôle qualité de premier niveau.',
     'Bac Pro usinage ou équivalent', '2 ans minimum', 2, 'open'),
    ('Chauffeur Livraison', 'Logistique',
     'Livraisons clients, chargement/déchargement, entretien véhicule.',
     'Permis C, expérience transport', '1 an', 1, 'open'),
    ('Comptable Junior', 'Administration & Finance',
     'Saisie comptable, rapprochements bancaires, support clôtures.',
     'Bac+2/3 Comptabilité', 'Débutant accepté', 1, 'on_hold'),
    ('Technicien Qualité', 'Qualité',
     'Contrôle des échantillons, rédaction des rapports de non-conformité.',
     'Bac+2 Qualité/Mesures', '1 an', 1, 'closed'),
]
jobs = {}
for title, dept, desc, qual, exp, openings, status in JOBS:
    j, _ = JobPosition.objects.get_or_create(
        job_title=title, department=depts[dept],
        defaults=dict(description=desc, required_qualifications=qual,
                       required_experience=exp, number_of_openings=openings, status=status),
    )
    jobs[title] = j
print(f"  {len(jobs)} postes")

# ── 8. Candidats & candidatures ───────────────────────────────────────────────
print("Candidats...")
CANDIDATES = [
    ('Yassine', 'Mernissi', '0670-200001', 'yassine.mernissi@gmail.com', 'Opérateur CNC', 'screening',
     'Bonne maîtrise des machines Haas, à confirmer en entretien.'),
    ('Imane', 'Cherkaoui', '0670-200002', 'imane.cherkaoui@gmail.com', 'Opérateur CNC', 'interview_scheduled',
     'Expérience chez Yazaki, profil intéressant.'),
    ('Hamza', 'Ziani', '0670-200003', 'hamza.ziani@gmail.com', 'Chauffeur Livraison', 'interviewed',
     'Permis C valide, bon entretien.'),
    ('Salma', 'Naciri', '0670-200004', 'salma.naciri@gmail.com', 'Comptable Junior', 'applied', ''),
    ('Adil', 'Belkadi', '0670-200005', 'adil.belkadi@gmail.com', 'Technicien Qualité', 'rejected',
     'Profil ne correspond pas (poste clôturé).'),
    ('Hajar', 'Moutaouakil', '0670-200006', 'hajar.moutaouakil@gmail.com', 'Opérateur CNC', 'hired',
     'Excellent entretien, intégration prévue.'),
]
for fn, ln, phone, email, job_title, stage, eval_text in CANDIDATES:
    cand, _ = Candidate.objects.get_or_create(
        first_name=fn, last_name=ln,
        defaults=dict(phone_number=phone, email=email, address='Tanger, Maroc', evaluation=eval_text),
    )
    Application.objects.get_or_create(
        candidate=cand, job_position=jobs[job_title],
        defaults=dict(current_stage=stage, notes=''),
    )
print(f"  {Candidate.objects.count()} candidats, {Application.objects.count()} candidatures")

# ── 9. Entretiens ──────────────────────────────────────────────────────────
print("Entretiens...")
INTERVIEWS = [
    ('Imane', 'Opérateur CNC', datetime(today.year, today.month, min(today.day + 3, 28), 10, 0), 'pending', ''),
    ('Hamza', 'Chauffeur Livraison', datetime(today.year, today.month, max(today.day - 5, 1), 14, 30), 'passed',
     'Bon relationnel, ponctuel.'),
    ('Hajar', 'Opérateur CNC', datetime(today.year, today.month, max(today.day - 10, 1), 9, 0), 'passed',
     'Très bonne maîtrise technique.'),
]
for cand_fn, job_title, interview_dt, result, comments in INTERVIEWS:
    cand = Candidate.objects.get(first_name=cand_fn)
    app = Application.objects.get(candidate=cand, job_position=jobs[job_title])
    Interview.objects.get_or_create(
        application=app, interview_date=interview_dt,
        defaults=dict(interviewer=admin, comments=comments, result=result),
    )
print(f"  {Interview.objects.count()} entretiens")

# ── 10. Démission ─────────────────────────────────────────────────────────
print("Démissions...")
Resignation.objects.get_or_create(
    employee=emps['EMP-0006'], request_date=today - timedelta(days=10),
    defaults=dict(
        last_working_day=today + timedelta(days=20),
        reason='Opportunité professionnelle dans une autre entreprise.',
        status='pending',
    ),
)
print(f"  {Resignation.objects.count()} démissions")

# ── Résumé ────────────────────────────────────────────────────────────────────
print()
print("=== Données RH chargées ===")
print(f"  Départements : {Department.objects.count()}")
print(f"  Employés     : {Employee.objects.count()}")
print(f"  Contrats     : {Contract.objects.count()}")
print(f"  Congés       : {LeaveRequest.objects.count()}")
print(f"  Pointages    : {Attendance.objects.count()}")
print(f"  Paie         : {PayrollRecord.objects.count()}")
print(f"  Postes       : {JobPosition.objects.count()}")
print(f"  Candidats    : {Candidate.objects.count()}")
print(f"  Candidatures : {Application.objects.count()}")
print(f"  Entretiens   : {Interview.objects.count()}")
print(f"  Démissions   : {Resignation.objects.count()}")
