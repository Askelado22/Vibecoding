from __future__ import annotations

from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class Item(models.Model):
    MOVE_STATUS_CHOICES = [
        ("Да", "Да"),
        ("Нет", "Нет"),
        ("Иероглифы", "Иероглифы"),
        ("Нет в наличии", "Нет в наличии"),
        ("Уже перенесен", "Уже перенесен"),
        ("Перенос не нужен", "Перенос не нужен"),
    ]

    product_url = models.URLField(
        unique=True,
        validators=[RegexValidator(r"^https://ggsel\.net/catalog/product/\d+", "Invalid GGSEL product URL")],
    )
    assignee_name = models.CharField(max_length=255, blank=True)
    move_status = models.CharField(max_length=32, choices=MOVE_STATUS_CHOICES, blank=True)
    move_status_set_by = models.EmailField(blank=True)
    move_status_set_at = models.DateTimeField(null=True, blank=True)
    final_breadcrumbs = models.TextField(blank=True)
    breadcrumbs_set_by = models.EmailField(blank=True)
    breadcrumbs_set_at = models.DateTimeField(null=True, blank=True)
    priority_raw = models.CharField(max_length=255, blank=True)
    completed_by = models.EmailField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    moved_flag_raw = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True)

    is_completed = models.BooleanField(default=False)
    row_index = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("row_index", "id")

    def touch_updated_at(self):
        self.updated_at = timezone.now()
        self.save(update_fields=["updated_at"])

    def has_breadcrumbs(self) -> bool:
        return bool(self.final_breadcrumbs.strip())
