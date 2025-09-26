from __future__ import annotations

from django.db import models
from django.utils import timezone


class SyncSettings(models.Model):
    auto_sync_enabled = models.BooleanField(default=False)
    last_pull_at = models.DateTimeField(null=True, blank=True)
    last_push_at = models.DateTimeField(null=True, blank=True)
    last_sync_status = models.CharField(max_length=32, blank=True)
    last_sync_message = models.TextField(blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"Auto sync: {'on' if self.auto_sync_enabled else 'off'}"


class SyncLog(models.Model):
    STATUS_CHOICES = [
        ("ok", "OK"),
        ("error", "Error"),
    ]

    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="ok")
    message = models.TextField(blank=True)

    def mark_finished(self, status: str, message: str = ""):
        self.finished_at = timezone.now()
        self.status = status
        self.message = message
        self.save(update_fields=["finished_at", "status", "message"])

    class Meta:
        ordering = ("-started_at",)
