from __future__ import annotations

from .services import SyncService


def run_sync() -> dict:
    service = SyncService()
    return service.run_sync()
