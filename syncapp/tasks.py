from __future__ import annotations

import logging
import os
import threading
import time

from django.conf import settings
from django.db import OperationalError

from .models import SyncSettings
from .services import SyncEngine

logger = logging.getLogger(__name__)


class AutoSyncScheduler:
    def __init__(self):
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        if os.environ.get('RUN_MAIN') == 'false':
            return
        if not settings.AUTO_SYNC_ENABLED:
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info('Автосинк запущен')

    def stop(self):
        if self._thread and self._thread.is_alive():
            self._stop_event.set()
            self._thread.join(timeout=1)
            logger.info('Автосинк остановлен')

    def _run(self):
        while not self._stop_event.is_set():
            try:
                settings_obj = SyncSettings.get_solo()
            except OperationalError:
                time.sleep(5)
                continue
            if settings_obj.auto_sync_enabled:
                try:
                    SyncEngine().run_sync()
                except Exception as exc:
                    logger.warning('Ошибка автосинка: %s', exc)
            self._stop_event.wait(60 * 30)


auto_sync_scheduler = AutoSyncScheduler()
