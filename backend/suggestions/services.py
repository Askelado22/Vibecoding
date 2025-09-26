from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import requests
from django.conf import settings

from .models import Suggestion


@dataclass
class SuggestionDTO:
    path: str
    score: float
    source: str
    meta: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        if payload["meta"] is None:
            payload["meta"] = {}
        return payload


class SuggestionService:
    def __init__(self, http_client=requests):
        self.http_client = http_client
        self.external_endpoint = settings.SUGGESTIONS_HTTP_ENDPOINT

    def get_suggestions(self, item) -> list[dict[str, Any]]:
        local = self._get_local_suggestions(item)
        external = self._get_external_suggestions(item)
        combined = local + external
        if not combined:
            return []
        max_score = max(s.score for s in combined)
        min_score = min(s.score for s in combined)
        span = max_score - min_score or 1
        normalised = [
            SuggestionDTO(
                path=s.path,
                score=(s.score - min_score) / span,
                source=s.source,
                meta=s.meta,
            )
            for s in combined
        ]
        normalised.sort(key=lambda s: s.score, reverse=True)
        return [dto.to_dict() for dto in normalised[:5]]

    def _get_local_suggestions(self, item) -> list[SuggestionDTO]:
        queryset = Suggestion.objects.order_by("-score")[:10]
        return [SuggestionDTO(s.path, float(s.score), s.source, s.meta or {}) for s in queryset]

    def _get_external_suggestions(self, item) -> list[SuggestionDTO]:
        if not self.external_endpoint:
            return []
        payload = {
            "product_url": item.product_url,
            "comment": item.comment,
            "breadcrumbs": item.final_breadcrumbs,
        }
        try:
            response = self.http_client.post(
                self.external_endpoint,
                json=payload,
                timeout=5,
            )
            response.raise_for_status()
        except Exception:
            return []
        try:
            data = response.json()
        except ValueError:
            return []
        suggestions: list[SuggestionDTO] = []
        for entry in data or []:
            path = entry.get("path")
            score = entry.get("score")
            if not path or score is None:
                continue
            suggestions.append(
                SuggestionDTO(
                    path=path,
                    score=float(score),
                    source=Suggestion.Source.EXTERNAL,
                    meta=entry.get("meta") or {},
                )
            )
        return suggestions
