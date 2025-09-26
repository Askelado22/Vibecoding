from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from suggestions.services import SuggestionService

from .filters import ItemFilter
from .models import Item
from .serializers import ItemSerializer, ItemUpdateSerializer


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all().order_by("row_index", "id")
    serializer_class = ItemSerializer
    filterset_class = ItemFilter
    search_fields = ("product_url", "final_breadcrumbs", "comment")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return ItemUpdateSerializer
        return super().get_serializer_class()

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        now = timezone.now()
        updated_fields: list[str] = []
        if "move_status" in data:
            move_status = data["move_status"] or ""
            instance.move_status = move_status
            instance.move_status_set_by = request.user.email
            instance.move_status_set_at = now if move_status else None
            updated_fields.extend(["move_status", "move_status_set_by", "move_status_set_at"])
        if "final_breadcrumbs" in data:
            breadcrumbs = data["final_breadcrumbs"] or ""
            instance.final_breadcrumbs = breadcrumbs
            instance.breadcrumbs_set_by = request.user.email
            instance.breadcrumbs_set_at = now if breadcrumbs else None
            updated_fields.extend(["final_breadcrumbs", "breadcrumbs_set_by", "breadcrumbs_set_at"])
        if "comment" in data:
            instance.comment = data["comment"] or ""
            updated_fields.append("comment")
        instance.updated_at = now
        updated_fields.append("updated_at")
        instance.save(update_fields=updated_fields)
        return Response(ItemSerializer(instance).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        item = self.get_object()
        if not item.move_status or not item.final_breadcrumbs:
            return Response({"detail": "Cannot complete without status and breadcrumbs"}, status=400)
        now = timezone.now()
        item.priority_raw = "Средний"
        item.completed_by = request.user.email
        item.completed_at = now
        item.is_completed = True
        item.updated_at = now
        item.save(update_fields=[
            "priority_raw",
            "completed_by",
            "completed_at",
            "is_completed",
            "updated_at",
        ])
        return Response(ItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        item = self.get_object()
        display_name = request.user.display_name or request.user.email
        item.assignee_name = display_name
        item.updated_at = timezone.now()
        item.save(update_fields=["assignee_name", "updated_at"])
        return Response(ItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def unassign(self, request, pk=None):
        item = self.get_object()
        item.assignee_name = ""
        item.updated_at = timezone.now()
        item.save(update_fields=["assignee_name", "updated_at"])
        return Response(ItemSerializer(item).data)

    @action(detail=False, methods=["get"], url_path="next")
    def get_next(self, request):
        queue_name = request.user.display_name or request.user.email
        queryset = Item.objects.filter(assignee_name=queue_name, is_completed=False).order_by("row_index", "id")
        current_id = request.query_params.get("current")
        if current_id:
            try:
                current_item = queryset.get(pk=current_id)
            except Item.DoesNotExist:
                current_item = None
            if current_item:
                next_item = queryset.filter(
                    Q(row_index__gt=current_item.row_index)
                    | (Q(row_index=current_item.row_index) & Q(id__gt=current_item.id))
                ).first()
                if next_item:
                    return Response(ItemSerializer(next_item).data)
        item = queryset.first()
        if not item:
            return Response({"detail": "Queue is empty"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ItemSerializer(item).data)

    @action(detail=False, methods=["get"], url_path="prev")
    def get_prev(self, request):
        queue_name = request.user.display_name or request.user.email
        queryset = Item.objects.filter(assignee_name=queue_name, is_completed=False).order_by("row_index", "id")
        current_id = request.query_params.get("current")
        if current_id:
            try:
                current_item = queryset.get(pk=current_id)
            except Item.DoesNotExist:
                current_item = None
            if current_item:
                prev_item = queryset.filter(
                    Q(row_index__lt=current_item.row_index)
                    | (Q(row_index=current_item.row_index) & Q(id__lt=current_item.id))
                ).order_by("-row_index", "-id").first()
                if prev_item:
                    return Response(ItemSerializer(prev_item).data)
        item = queryset.order_by("-row_index", "-id").first()
        if not item:
            return Response({"detail": "Queue is empty"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ItemSerializer(item).data)

    @action(detail=True, methods=["get"], url_path="suggestions")
    def suggestions(self, request, pk=None):
        item = self.get_object()
        service = SuggestionService()
        suggestions = service.get_suggestions(item)
        return Response(suggestions)
