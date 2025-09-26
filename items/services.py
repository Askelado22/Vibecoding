from __future__ import annotations

from typing import Optional

from .models import Item


def get_personal_queue(user_display_name: str):
    return Item.objects.filter(assignee_name=user_display_name, is_completed=False).order_by('row_index', 'id')


def _ordered_ids(queryset) -> list[int]:
    return list(queryset.values_list('id', flat=True))


def get_next_item(user_display_name: str, current_id: Optional[int] = None) -> Optional[Item]:
    queryset = get_personal_queue(user_display_name)
    ids = _ordered_ids(queryset)
    if not ids:
        return None
    if current_id is None or current_id not in ids:
        return Item.objects.filter(pk=ids[0]).first()
    index = ids.index(current_id)
    if index + 1 < len(ids):
        return Item.objects.filter(pk=ids[index + 1]).first()
    return None


def get_prev_item(user_display_name: str, current_id: Optional[int] = None) -> Optional[Item]:
    queryset = get_personal_queue(user_display_name)
    ids = _ordered_ids(queryset)
    if not ids:
        return None
    if current_id is None or current_id not in ids:
        return Item.objects.filter(pk=ids[-1]).first()
    index = ids.index(current_id)
    if index - 1 >= 0:
        return Item.objects.filter(pk=ids[index - 1]).first()
    return None
