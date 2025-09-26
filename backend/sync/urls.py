from django.urls import path

from .views import MetricsView, RunSyncView, ToggleAutoSyncView

urlpatterns = [
    path("sync/run", RunSyncView.as_view(), name="sync-run"),
    path("sync/auto", ToggleAutoSyncView.as_view(), name="sync-auto"),
    path("metrics", MetricsView.as_view(), name="metrics"),
]
