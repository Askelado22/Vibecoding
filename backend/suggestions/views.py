from __future__ import annotations

import csv
import io
import json
from typing import Any

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin

from .models import Suggestion
from .serializers import SuggestionInputSerializer, SuggestionSerializer


class SuggestionUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        entries: list[dict[str, Any]] = []
        upload = request.FILES.get("file")
        if upload:
            content = upload.read().decode("utf-8")
            if upload.name.endswith(".json"):
                entries = self._parse_json(content)
            else:
                entries = self._parse_csv(content)
        elif isinstance(request.data, list):
            entries = request.data
        else:
            payload = request.data.get("data")
            if isinstance(payload, str):
                try:
                    entries = json.loads(payload)
                except json.JSONDecodeError:
                    return Response({"detail": "Invalid JSON payload"}, status=400)
        if not entries:
            return Response({"detail": "No suggestion entries found"}, status=400)
        serializers = [SuggestionInputSerializer(data=entry) for entry in entries]
        for serializer in serializers:
            serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            Suggestion.objects.bulk_create([serializer.create_instance() for serializer in serializers])
        return Response({"created": len(serializers)}, status=status.HTTP_201_CREATED)

    def _parse_json(self, content: str) -> list[dict[str, Any]]:
        data = json.loads(content)
        if isinstance(data, dict):
            data = data.get("items", [])
        return data if isinstance(data, list) else []

    def _parse_csv(self, content: str) -> list[dict[str, Any]]:
        stream = io.StringIO(content)
        reader = csv.reader(stream)
        rows = [row for row in reader if any(cell.strip() for cell in row)]
        if not rows:
            return []
        header = [cell.strip().lower() for cell in rows[0]]
        entries: list[dict[str, Any]] = []
        data_rows = rows[1:] if {"path", "score"} & set(header) else rows
        for row in data_rows:
            if {"path", "score"} & set(header):
                row_dict = {header[i]: row[i] if i < len(row) else "" for i in range(len(header))}
                path = row_dict.get("path") or row_dict.get("breadcrumb") or row_dict.get("keyword")
                score = row_dict.get("score") or row_dict.get("weight")
                source = row_dict.get("source")
                meta = {k: v for k, v in row_dict.items() if k not in {"path", "score", "source"}}
            else:
                path = row[1] if len(row) > 1 else row[0]
                score = row[2] if len(row) > 2 else row[-1]
                source = None
                meta = {}
            if not path or score in (None, ""):
                continue
            try:
                score_value = float(score)
            except ValueError:
                continue
            entries.append({
                "path": path,
                "score": score_value,
                "source": source or Suggestion.Source.UPLOADED,
                "meta": meta,
            })
        return entries


class SuggestionListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        suggestions = Suggestion.objects.order_by("-created_at")[:100]
        return Response(SuggestionSerializer(suggestions, many=True).data)
