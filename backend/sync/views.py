from __future__ import annotations

from django.db.models import Count
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from core.utils.env import get_bool
from items.models import Item

from .engine import run_sync
from .models import SyncSettings
from .tasks import toggle_auto_sync


class RunSyncView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, *args, **kwargs):
        result = run_sync()
        return Response(result, status=status.HTTP_200_OK)


class ToggleAutoSyncView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, *args, **kwargs):
        enabled = get_bool(str(request.data.get("enabled", "false")))
        settings_obj = toggle_auto_sync(enabled)
        return Response({"auto_sync_enabled": settings_obj.auto_sync_enabled})


class MetricsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        completed = (
            Item.objects.filter(is_completed=True)
            .values("completed_by")
            .annotate(total=Count("id"))
        )
        daily_activity = (
            Item.objects.filter(updated_at__isnull=False)
            .annotate(day=TruncDate("updated_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("day")
        )
        status_counts = (
            Item.objects.exclude(move_status="")
            .values("move_status")
            .annotate(total=Count("id"))
        )
        settings_obj = SyncSettings.objects.first()
        return Response(
            {
                "completed_by_user": list(completed),
                "daily_activity": list(daily_activity),
                "status_counts": list(status_counts),
                "sync_settings": {
                    "auto_sync_enabled": settings_obj.auto_sync_enabled if settings_obj else False,
                    "last_pull_at": settings_obj.last_pull_at if settings_obj else None,
                    "last_push_at": settings_obj.last_push_at if settings_obj else None,
                    "last_sync_status": settings_obj.last_sync_status if settings_obj else "",
                    "last_sync_message": settings_obj.last_sync_message if settings_obj else "",
                },
            }
        )
