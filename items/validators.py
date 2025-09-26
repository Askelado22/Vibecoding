from __future__ import annotations

import re
from typing import Sequence

from django.core.exceptions import ValidationError

PRODUCT_URL_REGEX = re.compile(r'^https://ggsel\.net/catalog/product/\d+')

MOVE_STATUS_CHOICES = (
    ('Да', 'Да'),
    ('Нет', 'Нет'),
    ('Иероглифы', 'Иероглифы'),
    ('Нет в наличии', 'Нет в наличии'),
    ('Уже перенесен', 'Уже перенесен'),
    ('Перенос не нужен', 'Перенос не нужен'),
)

TYPE_CHOICES: Sequence[str] = (
    'Аккаунты',
    'Ключи',
    'Покупка на ваш аккаунт',
    'Аренда аккаунтов',
    'Оффлайн аккаунты',
    'Услуги активации',
    'DLC',
    'Скины',
    'Предметы',
    'Валюта',
    'Боевой пропуск',
    'Наборы',
)

PLATFORM_CHOICES: Sequence[str] = (
    'Battle.net',
    'EA app',
    'Epic Games Store',
    'GOG',
    'Nintendo Switch',
    'PlayStation',
    'Steam',
    'Ubisoft Connect',
    'Xbox / Microsoft Store',
)

EDITION_CHOICES: Sequence[str] = (
    'Standard Edition',
    'Deluxe Edition',
)


def validate_product_url(value: str):
    if not PRODUCT_URL_REGEX.match(value):
        raise ValidationError('URL должен указывать на карточку товара GGSEL')


def validate_final_breadcrumbs(value: str):
    if not value:
        return
    segments = [segment.strip() for segment in value.split('>')]
    segments = [segment for segment in segments if segment]
    if len(segments) < 2:
        raise ValidationError('Должно быть минимум 2 сегмента пути')
    if len(segments) > 5:
        raise ValidationError('Путь не может содержать больше 5 сегментов')

    if len(segments) >= 3 and segments[2] not in TYPE_CHOICES:
        raise ValidationError('Некорректный тип товара')

    if len(segments) >= 4 and segments[3] not in PLATFORM_CHOICES:
        raise ValidationError('Некорректная платформа')

    if len(segments) == 5 and segments[4] not in EDITION_CHOICES:
        raise ValidationError('Некорректное издание')


def ensure_move_status(value: str):
    allowed = {choice for choice, _ in MOVE_STATUS_CHOICES}
    if value not in allowed:
        raise ValidationError('Недопустимый статус переноса')
