from __future__ import annotations

from django.test import TestCase

from items.models import Item
from suggestions.models import Suggestion
from suggestions.services import SuggestionService


class SuggestionServiceTests(TestCase):
    def setUp(self):
        self.item = Item.objects.create(product_url="https://ggsel.net/catalog/product/2")
        Suggestion.objects.create(path="Игры > Steam", score=0.8)
        Suggestion.objects.create(path="Игры > Origin", score=0.6)

    def test_returns_top_suggestions(self):
        service = SuggestionService(http_client=FakeClient())
        result = service.get_suggestions(self.item)
        self.assertTrue(result)
        self.assertLessEqual(len(result), 5)
        self.assertEqual(result[0]["source"], "uploaded")


class FakeClient:
    def post(self, *args, **kwargs):
        class Response:
            def raise_for_status(self):
                return None

            def json(self):
                return []

        return Response()
