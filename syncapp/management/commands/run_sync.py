from __future__ import annotations

from django.core.management.base import BaseCommand

from ...services import SyncEngine


class Command(BaseCommand):
    help = 'Запускает синхронизацию с Google Sheets'

    def handle(self, *args, **options):
        engine = SyncEngine()
        result = engine.run_sync()
        self.stdout.write(self.style.SUCCESS(f"Синхронизация завершена: {result}"))
