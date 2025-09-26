from __future__ import annotations

from rest_framework import serializers

from .models import Suggestion


class SuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ("path", "score", "source", "meta", "created_at")


class SuggestionInputSerializer(serializers.Serializer):
    path = serializers.CharField()
    score = serializers.FloatField()
    source = serializers.ChoiceField(choices=Suggestion.Source.choices, required=False)
    meta = serializers.JSONField(required=False)

    def create_instance(self) -> Suggestion:
        data = self.validated_data
        return Suggestion(
            path=data["path"],
            score=data["score"],
            source=data.get("source", Suggestion.Source.UPLOADED),
            meta=data.get("meta", {}),
        )
