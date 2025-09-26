from __future__ import annotations

from django.test import TestCase

from accounts.models import User
from items.models import Item
from items.serializers import ItemUpdateSerializer


class ItemSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="user@example.com", password="pass", display_name="User")
        self.item = Item.objects.create(product_url="https://ggsel.net/catalog/product/1")

    def test_breadcrumb_validation(self):
        serializer = ItemUpdateSerializer(instance=self.item, data={"final_breadcrumbs": "Игры"}, partial=True)
        self.assertFalse(serializer.is_valid())
        serializer = ItemUpdateSerializer(instance=self.item, data={"final_breadcrumbs": "Игры > Steam"}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_move_status_update_sets_fields(self):
        serializer = ItemUpdateSerializer(instance=self.item, data={"move_status": "Да"}, partial=True)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.item.refresh_from_db()
        self.assertEqual(self.item.move_status, "Да")
