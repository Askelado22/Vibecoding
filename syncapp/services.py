from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Iterable, List

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from zoneinfo import ZoneInfo

from items.models import Item
from .models import SyncSettings

logger = logging.getLogger(__name__)
MSK = ZoneInfo('Europe/Moscow')


def ensure_tz(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if timezone.is_naive(value):
        return value.replace(tzinfo=MSK)
    return value.astimezone(MSK)


def parse_msk(value: str | None) -> datetime | None:
    if not value:
        return None
    dt = parse_datetime(value)
    if dt is None:
        return None
    return ensure_tz(dt)


class SyncEngine:
    def __init__(self, session: requests.Session | None = None):
        self.base_url = settings.GAS_BASE_URL.rstrip('/') if settings.GAS_BASE_URL else ''
        self.session = session or requests.Session()

    def pull_sheet_rows(self) -> List[dict[str, Any]]:
        if not self.base_url:
            logger.info('GAS_BASE_URL не задан, пропускаем pull')
            return []
        params = {
            'action': 'pull',
            'spreadsheetId': settings.SHEET_SPREADSHEET_ID,
            'range': settings.SHEET_RANGE,
        }
        response = self.session.get(self.base_url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        if not data.get('ok'):
            raise ValueError(f"Ошибка GAS pull: {data}")
        rows = data.get('rows', [])
        normalized = []
        for idx, row in enumerate(rows, start=2):
            row = row + [''] * (13 - len(row))
            payload = {
                'product_url': row[0],
                'assignee_name': row[1],
                'move_status': row[2],
                'move_status_set_by': row[3],
                'move_status_set_at': parse_msk(row[4]),
                'final_breadcrumbs': row[5],
                'breadcrumbs_set_by': row[6],
                'breadcrumbs_set_at': parse_msk(row[7]),
                'priority_raw': row[8],
                'completed_by': row[9],
                'completed_at': parse_msk(row[10]),
                'moved_flag_raw': row[11],
                'comment': row[12],
                'row_index': idx,
            }
            timestamps = [payload['move_status_set_at'], payload['breadcrumbs_set_at'], payload['completed_at']]
            payload['remote_updated_at'] = max([value for value in timestamps if value]) if any(timestamps) else None
            normalized.append(payload)
        self._merge_rows(normalized)
        settings_obj = SyncSettings.get_solo()
        settings_obj.last_pull_at = timezone.now()
        settings_obj.save(update_fields=['last_pull_at'])
        return normalized

    def _merge_rows(self, rows: Iterable[dict[str, Any]]):
        for row in rows:
            product_url = row['product_url']
            if not product_url:
                continue
            remote_updated = row.get('remote_updated_at')
            with transaction.atomic():
                item, created = Item.objects.get_or_create(
                    product_url=product_url,
                    defaults={
                        'assignee_name': row['assignee_name'],
                        'move_status': row['move_status'],
                        'move_status_set_by': row['move_status_set_by'],
                        'move_status_set_at': row['move_status_set_at'],
                        'final_breadcrumbs': row['final_breadcrumbs'],
                        'breadcrumbs_set_by': row['breadcrumbs_set_by'],
                        'breadcrumbs_set_at': row['breadcrumbs_set_at'],
                        'priority_raw': row['priority_raw'],
                        'completed_by': row['completed_by'],
                        'completed_at': row['completed_at'],
                        'moved_flag_raw': row['moved_flag_raw'],
                        'comment': row['comment'],
                        'is_completed': bool(row['completed_at']),
                        'row_index': row['row_index'],
                        'updated_at': remote_updated or timezone.now(),
                    },
                )
                if not created:
                    if remote_updated and remote_updated <= item.updated_at:
                        continue
                    item.assignee_name = row['assignee_name']
                    item.move_status = row['move_status']
                    item.move_status_set_by = row['move_status_set_by']
                    item.move_status_set_at = row['move_status_set_at']
                    item.final_breadcrumbs = row['final_breadcrumbs']
                    item.breadcrumbs_set_by = row['breadcrumbs_set_by']
                    item.breadcrumbs_set_at = row['breadcrumbs_set_at']
                    item.priority_raw = row['priority_raw']
                    item.completed_by = row['completed_by']
                    item.completed_at = row['completed_at']
                    item.is_completed = bool(row['completed_at'])
                    item.moved_flag_raw = row['moved_flag_raw']
                    item.comment = row['comment']
                    item.row_index = row['row_index']
                    if remote_updated:
                        item.updated_at = remote_updated
                    item.save()
                else:
                    logger.info('Создан новый Item из GAS: %s', product_url)

    def push_sheet_rows(self):
        if not self.base_url:
            logger.info('GAS_BASE_URL не задан, пропускаем push')
            return
        settings_obj = SyncSettings.get_solo()
        since = settings_obj.last_push_at
        queryset = Item.objects.all()
        if since:
            queryset = queryset.filter(updated_at__gte=since)
        rows = []
        for item in queryset:
            rows.append({'row_index': item.row_index, 'values': self._serialize_item(item)})
        payload = {
            'action': 'push',
            'spreadsheetId': settings.SHEET_SPREADSHEET_ID,
            'range': settings.SHEET_RANGE,
            'rows': rows,
        }
        response = self.session.post(self.base_url, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        if not data.get('ok'):
            raise ValueError(f"Ошибка GAS push: {data}")
        settings_obj.last_push_at = timezone.now()
        settings_obj.save(update_fields=['last_push_at'])
        logger.info('Push завершен: %s', data)

    def _serialize_item(self, item: Item) -> List[Any]:
        return [
            item.product_url,
            item.assignee_name,
            item.move_status,
            item.move_status_set_by,
            item.move_status_set_at.isoformat() if item.move_status_set_at else '',
            item.final_breadcrumbs,
            item.breadcrumbs_set_by,
            item.breadcrumbs_set_at.isoformat() if item.breadcrumbs_set_at else '',
            item.priority_raw,
            item.completed_by,
            item.completed_at.isoformat() if item.completed_at else '',
            item.comment,
        ]

    def run_sync(self):
        settings_obj = SyncSettings.get_solo()
        status_payload = {'status': 'ok', 'message': 'Синхронизация успешно выполнена'}
        try:
            self.pull_sheet_rows()
            self.push_sheet_rows()
        except Exception as exc:
            logger.error('Синхронизация завершилась ошибкой: %s', exc)
            status_payload = {'status': 'error', 'message': str(exc)}
        settings_obj.last_sync_status = status_payload
        settings_obj.save(update_fields=['last_sync_status'])
        return status_payload
