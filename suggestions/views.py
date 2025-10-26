from __future__ import annotations

import csv
import io
import json
from typing import List

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from items.models import Item
from .serializers import SuggestionSerializer, SuggestionUploadSerializer
from .services import SuggestionService


class ItemSuggestionsView(APIView):
    def get(self, request, item_id: int):
        item = get_object_or_404(Item, pk=item_id)
        service = SuggestionService()
        suggestions = service.get_suggestions(
            product_url=item.product_url,
            title=item.comment or None,
            description=item.final_breadcrumbs or None,
        )
        return Response(suggestions)


class SuggestionUploadView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        try:
            payload = self._parse_payload(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        created = []
        for row in payload:
            serializer = SuggestionUploadSerializer(data=row)
            serializer.is_valid(raise_exception=True)
            suggestion = serializer.save()
            created.append(SuggestionSerializer(suggestion).data)
        return Response({'created': created}, status=status.HTTP_201_CREATED)

    def _parse_payload(self, request) -> List[dict]:
        if 'file' in request.FILES:
            file = request.FILES['file']
            content = file.read().decode('utf-8')
            if file.name.endswith('.csv'):
                reader = csv.DictReader(io.StringIO(content))
                return [row for row in reader]
            return json.loads(content)
        if isinstance(request.data, list):
            return request.data
        if 'items' in request.data and isinstance(request.data['items'], list):
            return request.data['items']
        raise ValueError('Ожидается список подсказок')
