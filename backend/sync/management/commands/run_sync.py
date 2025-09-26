from __future__ import annotations

from django.core.management.base import BaseCommand

from sync.engine import run_sync


class Command(BaseCommand):
    help = "Run a single sync cycle"

    def handle(self, *args, **options):
        result = run_sync()
        self.stdout.write(self.style.SUCCESS(f"Sync completed: {result}"))
