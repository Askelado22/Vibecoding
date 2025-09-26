from __future__ import annotations

from datetime import datetime
from typing import Iterable, List

import requests
from dateutil import parser
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from items.models import Item

from .models import SyncLog, SyncSettings


class SyncService:
    def __init__(self, http_client=requests):
        self.http_client = http_client

    def pull_sheet_rows(self) -> int:
        if not settings.GAS_BASE_URL:
            raise RuntimeError("GAS_BASE_URL is not configured")
        response = self.http_client.get(
            settings.GAS_BASE_URL,
            params={"action": "pull", "range": settings.SHEET_RANGE},
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("rows", [])
        updated = 0
        with transaction.atomic():
            for index, raw_row in enumerate(rows, start=2):
                item_data = self._row_to_item_data(raw_row)
                if not item_data["product_url"]:
                    continue
                item, created = Item.objects.get_or_create(
                    product_url=item_data["product_url"],
                    defaults=item_data,
                )
                item.row_index = index
                remote_updated_at = item_data["updated_at"]
                if created:
                    updated += 1
                    item.save()
                    continue
                if remote_updated_at and item.updated_at and remote_updated_at <= item.updated_at:
                    item.row_index = index
                    item.save(update_fields=["row_index"])
                    continue
                for field, value in item_data.items():
                    setattr(item, field, value)
                item.row_index = index
                item.save()
                updated += 1
        settings_obj = self._get_settings()
        settings_obj.last_pull_at = timezone.now()
        settings_obj.last_sync_status = "ok"
        settings_obj.save(update_fields=["last_pull_at", "last_sync_status", "updated_at"])
        return updated

    def push_sheet_rows(self) -> int:
        if not settings.GAS_BASE_URL:
            raise RuntimeError("GAS_BASE_URL is not configured")
        settings_obj = self._get_settings()
        queryset = Item.objects.all().order_by("row_index", "id")
        if settings_obj.last_push_at:
            queryset = queryset.filter(updated_at__gte=settings_obj.last_push_at)
        rows = [self._item_to_row(item) for item in queryset]
        if not rows:
            return 0
        response = self.http_client.post(
            settings.GAS_BASE_URL,
            json={"action": "push", "range": settings.SHEET_RANGE, "rows": rows},
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        settings_obj.last_push_at = timezone.now()
        settings_obj.last_sync_status = "ok"
        settings_obj.save(update_fields=["last_push_at", "last_sync_status", "updated_at"])
        return payload.get("updated", len(rows))

    def run_sync(self) -> dict:
        log = SyncLog.objects.create(status="ok")
        try:
            pulled = self.pull_sheet_rows()
            pushed = self.push_sheet_rows()
            log.mark_finished("ok", f"Pulled {pulled}, pushed {pushed}")
            return {"pulled": pulled, "pushed": pushed}
        except Exception as exc:
            log.mark_finished("error", str(exc))
            settings_obj = self._get_settings()
            settings_obj.last_sync_status = "error"
            settings_obj.last_sync_message = str(exc)
            settings_obj.save(update_fields=["last_sync_status", "last_sync_message", "updated_at"])
            raise

    def _row_to_item_data(self, row: Iterable) -> dict:
        row = list(row) + [None] * (13 - len(row))
        move_status_at = self._parse_date(row[4])
        breadcrumbs_at = self._parse_date(row[7])
        completed_at = self._parse_date(row[10])
        updated_candidates = [dt for dt in [move_status_at, breadcrumbs_at, completed_at] if dt]
        updated_at = max(updated_candidates) if updated_candidates else timezone.now()
        return {
            "product_url": row[0],
            "assignee_name": row[1] or "",
            "move_status": row[2] or "",
            "move_status_set_by": row[3] or "",
            "move_status_set_at": move_status_at,
            "final_breadcrumbs": row[5] or "",
            "breadcrumbs_set_by": row[6] or "",
            "breadcrumbs_set_at": breadcrumbs_at,
            "priority_raw": row[8] or "",
            "completed_by": row[9] or "",
            "completed_at": completed_at,
            "moved_flag_raw": row[11] or "",
            "comment": row[12] or "",
            "is_completed": bool(row[10] or row[9]),
            "updated_at": updated_at,
        }

    def _item_to_row(self, item: Item) -> List[str]:
        return [
            item.product_url,
            item.assignee_name,
            item.move_status,
            item.move_status_set_by,
            self._format_date(item.move_status_set_at),
            item.final_breadcrumbs,
            item.breadcrumbs_set_by,
            self._format_date(item.breadcrumbs_set_at),
            item.priority_raw,
            item.completed_by,
            self._format_date(item.completed_at),
            item.moved_flag_raw,
            item.comment,
        ]

    def _parse_date(self, value):
        if not value:
            return None
        if isinstance(value, (int, float)):
            dt = datetime.fromtimestamp(value, tz=timezone.utc)
            return dt.astimezone(timezone.get_current_timezone())
        try:
            dt = parser.parse(str(value))
        except (ValueError, TypeError):
            return None
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone=timezone.get_current_timezone())
        return dt.astimezone(timezone.get_current_timezone())

    def _format_date(self, value):
        if not value:
            return ""
        return timezone.localtime(value).isoformat()

    def _get_settings(self) -> SyncSettings:
        settings_obj, _ = SyncSettings.objects.get_or_create(pk=1, defaults={"auto_sync_enabled": settings.AUTO_SYNC_ENABLED_DEFAULT})
        return settings_obj
