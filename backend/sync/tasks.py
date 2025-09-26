from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings
from django.utils import timezone

from .engine import run_sync
from .models import SyncSettings

scheduler: BackgroundScheduler | None = None


def start_auto_sync():
    global scheduler
    if scheduler and scheduler.running:
        return scheduler
    scheduler = BackgroundScheduler(timezone=str(timezone.get_current_timezone()))
    scheduler.add_job(run_sync, "interval", minutes=30, id="auto-sync", replace_existing=True)
    scheduler.start()
    return scheduler


def stop_auto_sync():
    global scheduler
    if scheduler and scheduler.running:
        scheduler.remove_all_jobs()
        scheduler.shutdown()
        scheduler = None


def toggle_auto_sync(enabled: bool):
    settings_obj, _ = SyncSettings.objects.get_or_create(pk=1, defaults={"auto_sync_enabled": settings.AUTO_SYNC_ENABLED_DEFAULT})
    settings_obj.auto_sync_enabled = enabled
    settings_obj.save(update_fields=["auto_sync_enabled", "updated_at"])
    if enabled:
        start_auto_sync()
    else:
        stop_auto_sync()
    return settings_obj
