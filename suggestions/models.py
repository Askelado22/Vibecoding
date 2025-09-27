from __future__ import annotations

from django.db import models


class Suggestion(models.Model):
    class Source(models.TextChoices):
        UPLOADED = 'uploaded', 'Uploaded'
        EXTERNAL = 'external', 'External'

    path = models.CharField(max_length=255)
    score = models.FloatField(default=0)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.UPLOADED)
    meta = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self) -> str:
        return f'{self.path} ({self.score})'
