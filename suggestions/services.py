from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable, List

import requests
from django.conf import settings

from items.validators import validate_final_breadcrumbs
from .models import Suggestion

logger = logging.getLogger(__name__)


@dataclass
class SuggestionPayload:
    path: str
    score: float
    source: str
    meta: dict | None = None


class SuggestionService:
    def __init__(self, endpoint: str | None = None):
        self.endpoint = endpoint or settings.SUGGESTIONS_HTTP_ENDPOINT

    def _normalize(self, suggestions: Iterable[SuggestionPayload]) -> List[SuggestionPayload]:
        seen = set()
        result: List[SuggestionPayload] = []
        for suggestion in suggestions:
            if not suggestion.path:
                continue
            try:
                validate_final_breadcrumbs(suggestion.path)
            except Exception:
                logger.warning('Suggestion %s не прошла валидацию', suggestion.path)
                continue
            if suggestion.path in seen:
                continue
            seen.add(suggestion.path)
            result.append(suggestion)
        result.sort(key=lambda item: item.score, reverse=True)
        return result[:5]

    def _from_local(self) -> List[SuggestionPayload]:
        suggestions = []
        for suggestion in Suggestion.objects.all().order_by('-score')[:20]:
            suggestions.append(
                SuggestionPayload(
                    path=suggestion.path,
                    score=suggestion.score,
                    source=suggestion.source,
                    meta=suggestion.meta or {},
                )
            )
        return suggestions

    def _from_external(self, *, product_url: str, title: str | None, description: str | None) -> List[SuggestionPayload]:
        if not self.endpoint:
            return []
        try:
            response = requests.post(
                self.endpoint,
                json={'product_url': product_url, 'title': title, 'description': description},
                timeout=5,
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.warning('Ошибка внешнего сервиса подсказок: %s', exc)
            return []
        suggestions: List[SuggestionPayload] = []
        for item in data or []:
            path = item.get('path')
            if not path:
                continue
            try:
                score = float(item.get('score', 0))
            except (TypeError, ValueError):
                score = 0
            suggestions.append(SuggestionPayload(path=path, score=score, source='external', meta=item))
        return suggestions

    def get_suggestions(self, *, product_url: str, title: str | None = None, description: str | None = None) -> List[dict]:
        merged = self._from_local() + self._from_external(product_url=product_url, title=title, description=description)
        normalized = self._normalize(merged)
        return [
            {
                'path': suggestion.path,
                'score': suggestion.score,
                'source': suggestion.source,
                'meta': suggestion.meta or {},
            }
            for suggestion in normalized
        ]
