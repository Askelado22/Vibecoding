from __future__ import annotations

from random import choice

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from items.models import Item
from suggestions.models import Suggestion

SAMPLE_STATUSES = ["Да", "Нет", "Иероглифы", "Нет в наличии", "Уже перенесен", "Перенос не нужен"]


class Command(BaseCommand):
    help = "Seed the database with demo data"

    def handle(self, *args, **options):
        self.stdout.write("Creating users...")
        self._create_users()
        self.stdout.write("Creating items...")
        self._create_items()
        self.stdout.write("Creating suggestions...")
        self._create_suggestions()
        self.stdout.write(self.style.SUCCESS("Seed data created"))

    def _create_users(self):
        users = [
            ("admin@example.com", "password123", User.Role.ADMIN, "Admin"),
            ("askelwhite22@gmail.com", "white13", User.Role.ADMIN, "White"),
            ("worker@example.com", "worker123", User.Role.WORKER, "Worker"),
        ]
        for email, password, role, display_name in users:
            user, created = User.objects.get_or_create(email=email, defaults={"role": role, "display_name": display_name})
            if created:
                user.set_password(password)
                user.save()

    def _create_items(self):
        if Item.objects.exists():
            return
        now = timezone.now()
        for idx in range(1, 11):
            status = choice(SAMPLE_STATUSES)
            breadcrumbs = f"Игры > Категория {idx}"
            Item.objects.create(
                product_url=f"https://ggsel.net/catalog/product/{1000+idx}",
                assignee_name="Worker",
                move_status=status,
                move_status_set_by="admin@example.com",
                move_status_set_at=now,
                final_breadcrumbs=breadcrumbs,
                breadcrumbs_set_by="worker@example.com",
                breadcrumbs_set_at=now,
                priority_raw="Средний" if idx % 2 == 0 else "Низкий",
                completed_by="worker@example.com" if idx % 2 == 0 else "",
                completed_at=now if idx % 2 == 0 else None,
                moved_flag_raw="",
                comment=f"Комментарий {idx}",
                is_completed=idx % 2 == 0,
                row_index=idx + 1,
            )

    def _create_suggestions(self):
        if Suggestion.objects.exists():
            return
        Suggestion.objects.create(path="Игры > Steam", score=0.9, source=Suggestion.Source.UPLOADED)
        Suggestion.objects.create(path="Игры > Origin", score=0.7, source=Suggestion.Source.UPLOADED)
