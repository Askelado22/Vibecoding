from __future__ import annotations

import re
from datetime import timedelta

import requests
from bs4 import BeautifulSoup
from django.core.cache import cache
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from items.models import Item
from .models import SyncSettings
from .serializers import SyncSettingsSerializer
from .services import SyncEngine
from .tasks import auto_sync_scheduler

PRODUCT_URL_REGEX = re.compile(r'^https://ggsel\.net/catalog/product/\d+')


class SyncRunView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        engine = SyncEngine()
        result = engine.run_sync()
        return Response(result)


class SyncAutoToggleView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        enabled = bool(request.data.get('enabled'))
        settings_obj = SyncSettings.get_solo()
        settings_obj.auto_sync_enabled = enabled
        settings_obj.save(update_fields=['auto_sync_enabled'])
        auto_sync_scheduler.start()
        return Response(SyncSettingsSerializer(settings_obj).data)


class MetricsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        completed_stats = (
            Item.objects.filter(is_completed=True)
            .values('completed_by')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        by_day = (
            Item.objects.filter(updated_at__gte=timezone.now() - timedelta(days=30))
            .annotate(day=TruncDate('updated_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        status_changes = (
            Item.objects.exclude(move_status_set_at__isnull=True)
            .values('move_status_set_by')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        breadcrumbs_changes = (
            Item.objects.exclude(breadcrumbs_set_at__isnull=True)
            .values('breadcrumbs_set_by')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        return Response(
            {
                'completed_by_user': list(completed_stats),
                'activity_by_day': list(by_day),
                'status_changes': list(status_changes),
                'breadcrumbs_changes': list(breadcrumbs_changes),
            }
        )


class FetchProductView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    rate_limit = 30

    def get(self, request):
        url = request.query_params.get('url')
        if not url:
            return Response({'detail': 'Параметр url обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        if not PRODUCT_URL_REGEX.match(url):
            return Response({'detail': 'Некорректная ссылка'}, status=status.HTTP_400_BAD_REQUEST)
        cache_key = f'fetchProduct:{url}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        if not self._check_rate_limit(request.user):
            return Response({'detail': 'Превышен лимит запросов'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        try:
            html = self._fetch(url)
            data = self._parse(html, url)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        cache.set(cache_key, data, 60 * 15)
        return Response(data)

    def _check_rate_limit(self, user) -> bool:
        key = f'scraper:rate:{user.pk}'
        count = cache.get(key, 0)
        if count >= self.rate_limit:
            return False
        cache.set(key, count + 1, 60)
        return True

    def _fetch(self, url: str) -> str:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; GGSELBot/1.0)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.text

    def _parse(self, html: str, url: str) -> dict:
        soup = BeautifulSoup(html, 'html.parser')
        title = (soup.select_one('h1') or soup.select_one('title'))
        title_text = title.get_text(strip=True) if title else ''
        description_node = soup.select_one('[itemprop="description"], .product-description, .description')
        description_html = description_node.decode_contents() if description_node else ''
        short_description = description_node.get_text(' ', strip=True) if description_node else ''
        price_node = soup.select_one('.product-price, [itemprop="price"]')
        price = self._normalize_price(price_node.get_text() if price_node else '')
        images = []
        for img in soup.select('img'):
            src = img.get('src')
            if src and src.startswith('http'):
                images.append(src)
            if len(images) >= 10:
                break
        seller_name = ''
        seller_url = ''
        rating = ''
        seller_link = soup.select_one('.seller-info a, a[href*="seller"]')
        if seller_link:
            seller_name = seller_link.get_text(strip=True)
            seller_url = seller_link.get('href', '')
        rating_node = soup.select_one('.seller-rating, .rating')
        if rating_node:
            rating = rating_node.get_text(strip=True)
        breadcrumbs = [
            el.get_text(strip=True)
            for el in soup.select('.breadcrumb li, nav[aria-label="breadcrumb"] li')
            if el.get_text(strip=True)
        ]
        return {
            'title': title_text,
            'description': short_description,
            'description_html': description_html,
            'price': price,
            'images': images,
            'seller': {'name': seller_name, 'url': seller_url, 'rating': rating},
            'breadcrumbs': breadcrumbs,
            'source_url': url,
        }

    def _normalize_price(self, text: str) -> float:
        digits = re.sub(r'[^0-9.,]', '', text)
        digits = digits.replace(',', '.')
        try:
            return float(digits)
        except ValueError:
            return 0.0
