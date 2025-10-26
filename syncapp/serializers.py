from __future__ import annotations

from rest_framework import serializers

from .models import SyncSettings


class SyncSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncSettings
        fields = ('auto_sync_enabled', 'last_pull_at', 'last_push_at', 'last_sync_status')
