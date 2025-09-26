from __future__ import annotations

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .filters import ItemFilter
from .models import Item
from .serializers import CompletionSerializer, ItemSerializer, ItemUpdateSerializer
from .services import get_next_item, get_prev_item


class ItemPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50

    def get_page_size(self, request):
        size = super().get_page_size(request)
        if size is None:
            size = self.page_size
        return max(20, min(self.max_page_size, size))


class ItemViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    filterset_class = ItemFilter
    pagination_class = ItemPagination
    search_fields = ('product_url', 'final_breadcrumbs', 'comment')
    ordering_fields = ('updated_at', 'row_index', 'product_url')

    def get_serializer_class(self):
        if self.action in ['partial_update', 'update']:
            return ItemUpdateSerializer
        return ItemSerializer

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='next')
    def next_item(self, request):
        current_id = request.query_params.get('current')
        current_id = int(current_id) if current_id is not None and current_id.isdigit() else None
        item = get_next_item(request.user.display_name or request.user.email, current_id)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ItemSerializer(item, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='prev')
    def prev_item(self, request):
        current_id = request.query_params.get('current')
        current_id = int(current_id) if current_id is not None and current_id.isdigit() else None
        item = get_prev_item(request.user.display_name or request.user.email, current_id)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ItemSerializer(item, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        item = self.get_object()
        serializer = CompletionSerializer(data=request.data, context={'item': item})
        serializer.is_valid(raise_exception=True)
        item.complete(request.user.email)
        item.save()
        return Response(ItemSerializer(item, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        item = self.get_object()
        display_name = request.user.display_name or request.user.email
        item.assignee_name = display_name
        item.touch()
        item.save(update_fields=['assignee_name', 'updated_at'])
        return Response(ItemSerializer(item, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def unassign(self, request, pk=None):
        item = self.get_object()
        item.assignee_name = ''
        item.touch()
        item.save(update_fields=['assignee_name', 'updated_at'])
        return Response(ItemSerializer(item, context={'request': request}).data)
