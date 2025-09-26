from django.contrib import admin

from .models import SyncLog, SyncSettings


@admin.register(SyncSettings)
class SyncSettingsAdmin(admin.ModelAdmin):
    list_display = ("auto_sync_enabled", "last_pull_at", "last_push_at", "last_sync_status")


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ("started_at", "finished_at", "status")
    list_filter = ("status",)
