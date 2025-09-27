from __future__ import annotations

from django.db import models


class SyncSettings(models.Model):
    auto_sync_enabled = models.BooleanField(default=False)
    last_pull_at = models.DateTimeField(null=True, blank=True)
    last_push_at = models.DateTimeField(null=True, blank=True)
    last_sync_status = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Sync settings'
        verbose_name_plural = 'Sync settings'

    def __str__(self) -> str:
        return 'Sync settings'

    @classmethod
    def get_solo(cls) -> 'SyncSettings':
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'auto_sync_enabled': False})
        return obj
