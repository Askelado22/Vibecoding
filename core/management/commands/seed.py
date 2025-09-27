from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from items.models import Item
from suggestions.models import Suggestion


class Command(BaseCommand):
    help = 'Создает пользователей, товары и подсказки для разработки'

    def handle(self, *args, **options):
        self._seed_users()
        self._seed_items()
        self._seed_suggestions()
        self.stdout.write(self.style.SUCCESS('База засеяна тестовыми данными'))

    def _seed_users(self):
        users = [
            ('admin@example.com', 'password123', User.Role.ADMIN, 'Admin'),
            ('askelwhite22@gmail.com', 'white13', User.Role.ADMIN, 'Алексей'),
            ('worker@example.com', 'worker123', User.Role.WORKER, 'Worker'),
        ]
        for email, password, role, display in users:
            user, created = User.objects.get_or_create(email=email, defaults={'role': role, 'display_name': display})
            user.set_password(password)
            user.role = role
            user.display_name = display
            user.is_active = True
            user.save()
            action = 'Создан' if created else 'Обновлен'
            self.stdout.write(f'{action} пользователь {email}')

    def _seed_items(self):
        sample_items = [
            {
                'product_url': 'https://ggsel.net/catalog/product/1000',
                'assignee_name': 'Worker',
                'move_status': 'Да',
                'final_breadcrumbs': 'Игры > Cyberpunk 2077 > Ключи > Steam',
                'comment': 'Проверить описание',
            },
            {
                'product_url': 'https://ggsel.net/catalog/product/1001',
                'assignee_name': 'Worker',
                'move_status': 'Нет',
                'final_breadcrumbs': 'Программное обеспечение > Windows 11 > Ключи > Microsoft Store',
                'comment': 'Нет поставки',
            },
            {
                'product_url': 'https://ggsel.net/catalog/product/1002',
                'assignee_name': 'Алексей',
                'move_status': 'Перенос не нужен',
                'final_breadcrumbs': 'Игры > Baldur\'s Gate 3 > Ключи > Steam > Deluxe Edition',
                'comment': 'Совпадает с текущей',
            },
        ]
        for index, payload in enumerate(sample_items, start=1):
            item, created = Item.objects.get_or_create(product_url=payload['product_url'], defaults=payload)
            item.row_index = index + 1
            item.updated_at = timezone.now()
            item.save()
            self.stdout.write(f"{'Создан' if created else 'Обновлен'} товар {item.product_url}")

    def _seed_suggestions(self):
        suggestions = [
            ('Игры > Hogwarts Legacy > Ключи > Steam', 0.95),
            ('Игры > Elden Ring > Ключи > Steam', 0.9),
        ]
        for path, score in suggestions:
            Suggestion.objects.update_or_create(path=path, defaults={'score': score, 'source': Suggestion.Source.UPLOADED})
            self.stdout.write(f'Добавлена подсказка {path}')
