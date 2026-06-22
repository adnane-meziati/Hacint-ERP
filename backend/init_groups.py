#!/usr/bin/env python
"""
Initialisation script — creates permission groups and admin superuser.
No sample data is created.
Run with: python init_groups.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.contrib.auth.models import Group, User

# ── Create permission groups ──────────────────────────────────────────────────
for group_name in ['Designer', 'Programmateur', 'CNC', 'Assembly', 'Quality']:
    _, created = Group.objects.get_or_create(name=group_name)
    print(f'Groupe {"créé" if created else "existant"}: {group_name}')

# ── Superuser ─────────────────────────────────────────────────────────────────
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@hacint.local', 'admin123')
    print('Superuser créé: admin / admin123')
else:
    print('Superuser existant.')

print('Initialisation terminée.')
