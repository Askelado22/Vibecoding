from django.apps import AppConfig


class SyncappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'syncapp'

    def ready(self):
        from .tasks import auto_sync_scheduler

        auto_sync_scheduler.start()
