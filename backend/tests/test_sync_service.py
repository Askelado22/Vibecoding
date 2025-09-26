from __future__ import annotations

from django.test import TestCase
from django.utils import timezone

from items.models import Item
from sync.services import SyncService


class SyncServiceTests(TestCase):
    def setUp(self):
        self.service = SyncService(http_client=FakeHttpClient())

    def test_row_to_item_data_parses_dates(self):
        now_iso = timezone.now().isoformat()
        row = [
            "https://ggsel.net/catalog/product/3",
            "Worker",
            "Да",
            "worker@example.com",
            now_iso,
            "Игры > Steam",
            "worker@example.com",
            now_iso,
            "Средний",
            "worker@example.com",
            now_iso,
            "",
            "",
        ]
        data = self.service._row_to_item_data(row)
        self.assertEqual(data["product_url"], row[0])
        self.assertTrue(data["updated_at"])

    def test_item_to_row(self):
        item = Item.objects.create(product_url="https://ggsel.net/catalog/product/4")
        row = self.service._item_to_row(item)
        self.assertEqual(row[0], item.product_url)


class FakeHttpClient:
    def get(self, *args, **kwargs):
        class Response:
            def raise_for_status(self):
                return None

            def json(self):
                return {"rows": []}

        return Response()

    def post(self, *args, **kwargs):
        class Response:
            def raise_for_status(self):
                return None

            def json(self):
                return {"updated": 0}

        return Response()
