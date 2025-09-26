from __future__ import annotations

import time

from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import GGSELScraper, GGSEL_PRODUCT_PATTERN

RATE_LIMIT = 30
RATE_INTERVAL = 60


class FetchProductView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        url = request.query_params.get("url")
        if not url:
            return Response({"detail": "Missing url parameter"}, status=status.HTTP_400_BAD_REQUEST)
        if not GGSEL_PRODUCT_PATTERN.match(url):
            return Response({"detail": "Invalid GGSEL product URL"}, status=status.HTTP_400_BAD_REQUEST)
        if not self._check_rate_limit(request):
            return Response({"detail": "Rate limit exceeded"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        scraper = GGSELScraper()
        try:
            payload = scraper.fetch(url)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(payload)

    def _check_rate_limit(self, request) -> bool:
        identifier = request.user.email if request.user.is_authenticated else request.META.get("REMOTE_ADDR", "anon")
        bucket = int(time.time() // RATE_INTERVAL)
        key = f"scraper:rate:{identifier}:{bucket}"
        current = cache.get(key, 0)
        if current >= RATE_LIMIT:
            return False
        cache.set(key, current + 1, RATE_INTERVAL)
        return True
