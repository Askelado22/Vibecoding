from __future__ import annotations

from rest_framework import serializers

from .models import Suggestion


class SuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ('id', 'path', 'score', 'source', 'meta', 'created_at')


class SuggestionUploadSerializer(serializers.Serializer):
    path = serializers.CharField()
    score = serializers.FloatField()
    source = serializers.ChoiceField(choices=Suggestion.Source.choices, required=False)
    meta = serializers.JSONField(required=False)

    def create(self, validated_data):
        source = validated_data.get('source') or Suggestion.Source.UPLOADED
        suggestion, _ = Suggestion.objects.update_or_create(
            path=validated_data['path'],
            defaults={'score': validated_data['score'], 'source': source, 'meta': validated_data.get('meta', {})},
        )
        return suggestion
