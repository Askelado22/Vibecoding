from django.urls import path

from .views import FetchProductView, MetricsView, SyncAutoToggleView, SyncRunView

urlpatterns = [
    path('admin/sync/run', SyncRunView.as_view(), name='sync-run'),
    path('admin/sync/auto', SyncAutoToggleView.as_view(), name='sync-auto'),
    path('admin/metrics', MetricsView.as_view(), name='admin-metrics'),
    path('fetchProduct', FetchProductView.as_view(), name='fetch-product'),
]
