from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = "__all__"
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "moved_flag_raw",
        )

    def validate_final_breadcrumbs(self, value: str) -> str:
        if not value:
            return value
        segments = [segment.strip() for segment in value.split(">") if segment.strip()]
        if len(segments) < 2:
            raise serializers.ValidationError("Breadcrumbs must contain at least two segments")
        return " > ".join(segments)

    def validate(self, attrs):
        if attrs.get("is_completed"):
            move_status = attrs.get("move_status") or getattr(self.instance, "move_status", "")
            breadcrumbs = attrs.get("final_breadcrumbs") or getattr(self.instance, "final_breadcrumbs", "")
            if not move_status or not breadcrumbs:
                raise serializers.ValidationError("Cannot mark completed without status and breadcrumbs")
        return super().validate(attrs)


class ItemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ("move_status", "final_breadcrumbs", "comment")

    def validate_final_breadcrumbs(self, value: str) -> str:
        if value is None:
            return value
        if value == "":
            return value
        segments = [segment.strip() for segment in value.split(">") if segment.strip()]
        if len(segments) < 2:
            raise serializers.ValidationError("Breadcrumbs must contain at least two segments")
        return " > ".join(segments)
