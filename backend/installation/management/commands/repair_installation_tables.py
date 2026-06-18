from django.core.management.base import BaseCommand
from django.db import connection

from installation.models import (
    InstallationProject,
    InstallationProduct,
    InstallationTask,
    InstallationDocument,
    InstallationReport,
    InstallationNotification,
)


class Command(BaseCommand):
    help = 'Create missing installation tables when the migration state says applied but PostgreSQL tables are absent.'

    def handle(self, *args, **options):
        models = [
            InstallationProject,
            InstallationProduct,
            InstallationTask,
            InstallationDocument,
            InstallationReport,
            InstallationNotification,
        ]
        existing = set(connection.introspection.table_names())
        created = []
        with connection.schema_editor() as schema_editor:
            for model in models:
                table = model._meta.db_table
                if table not in existing:
                    schema_editor.create_model(model)
                    created.append(table)
        if created:
            self.stdout.write(self.style.SUCCESS('Installation tables repaired: ' + ', '.join(created)))
        else:
            self.stdout.write(self.style.SUCCESS('Installation tables OK'))
