from __future__ import annotations

from typing import Any

from django.utils import timezone
from rest_framework import serializers

from .models import Item
from .validators import ensure_move_status, validate_final_breadcrumbs


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = (
            'id',
            'product_url',
            'assignee_name',
            'move_status',
            'move_status_set_by',
            'move_status_set_at',
            'final_breadcrumbs',
            'breadcrumbs_set_by',
            'breadcrumbs_set_at',
            'priority_raw',
            'completed_by',
            'completed_at',
            'moved_flag_raw',
            'comment',
            'is_completed',
            'row_index',
            'created_at',
            'updated_at',
        )


class ItemUpdateSerializer(serializers.ModelSerializer):
    move_status = serializers.CharField(required=False, allow_blank=True)
    final_breadcrumbs = serializers.CharField(required=False, allow_blank=True)
    comment = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Item
        fields = ('move_status', 'final_breadcrumbs', 'comment')

    def validate_move_status(self, value: str) -> str:
        if value:
            ensure_move_status(value)
        return value

    def validate_final_breadcrumbs(self, value: str) -> str:
        if value:
            validate_final_breadcrumbs(value)
        return value

    def update(self, instance: Item, validated_data: dict[str, Any]) -> Item:
        request = self.context['request']
        user_email = request.user.email
        now = timezone.now()

        if 'move_status' in validated_data:
            status_value = validated_data.get('move_status')
            if status_value:
                instance.move_status = status_value
                instance.move_status_set_by = user_email
                instance.move_status_set_at = now
            else:
                instance.move_status = ''
                instance.move_status_set_by = ''
                instance.move_status_set_at = None
            instance.updated_at = now

        if 'final_breadcrumbs' in validated_data:
            breadcrumbs = validated_data.get('final_breadcrumbs')
            if breadcrumbs:
                instance.final_breadcrumbs = breadcrumbs
                instance.breadcrumbs_set_by = user_email
                instance.breadcrumbs_set_at = now
            else:
                instance.final_breadcrumbs = ''
                instance.breadcrumbs_set_by = ''
                instance.breadcrumbs_set_at = None
            instance.updated_at = now

        if 'comment' in validated_data:
            instance.comment = validated_data['comment']
            instance.updated_at = now

        instance.save()
        return instance


class CompletionSerializer(serializers.Serializer):
    def validate(self, attrs):
        item: Item = self.context['item']
        if not item.move_status or not item.final_breadcrumbs:
            raise serializers.ValidationError('Нельзя завершить без статуса и крошек')
        return attrs
