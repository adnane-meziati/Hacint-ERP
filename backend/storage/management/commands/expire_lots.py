from django.core.management.base import BaseCommand

from storage.views import _expire_lots


class Command(BaseCommand):
    help = "Marque comme 'périmé' tous les lots actifs dont la date de péremption est dépassée."

    def handle(self, *args, **options):
        count = _expire_lots()
        if count:
            self.stdout.write(self.style.SUCCESS(f"{count} lot(s) marqué(s) comme périmé(s)."))
        else:
            self.stdout.write("Aucun lot à expirer.")
