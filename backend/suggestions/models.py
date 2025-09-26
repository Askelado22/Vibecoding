from __future__ import annotations

from django.db import models
from django.utils import timezone


class Suggestion(models.Model):
    class Source(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        EXTERNAL = "external", "External"

    path = models.CharField(max_length=512)
    score = models.FloatField(default=0)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.UPLOADED)
    meta = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:  # pragma: no cover - debug
        return f"{self.path} ({self.score})"
