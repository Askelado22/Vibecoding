from __future__ import annotations

from django.db import models
from django.utils import timezone

from .validators import MOVE_STATUS_CHOICES, ensure_move_status, validate_final_breadcrumbs, validate_product_url


class Item(models.Model):
    product_url = models.URLField(unique=True, validators=[validate_product_url])
    assignee_name = models.CharField(max_length=255, blank=True)
    move_status = models.CharField(max_length=64, choices=MOVE_STATUS_CHOICES, blank=True)
    move_status_set_by = models.EmailField(blank=True)
    move_status_set_at = models.DateTimeField(null=True, blank=True)
    final_breadcrumbs = models.TextField(blank=True, validators=[validate_final_breadcrumbs])
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
        ordering = ['-updated_at']

    def __str__(self) -> str:
        return f'{self.product_url}'

    def clean(self):
        if self.move_status:
            ensure_move_status(self.move_status)
        if self.final_breadcrumbs:
            validate_final_breadcrumbs(self.final_breadcrumbs)

    def mark_move_status(self, status: str, user_email: str):
        ensure_move_status(status)
        now = timezone.now()
        self.move_status = status
        self.move_status_set_by = user_email
        self.move_status_set_at = now
        self.updated_at = now

    def set_breadcrumbs(self, breadcrumbs: str, user_email: str):
        validate_final_breadcrumbs(breadcrumbs)
        now = timezone.now()
        self.final_breadcrumbs = breadcrumbs
        self.breadcrumbs_set_by = user_email
        self.breadcrumbs_set_at = now
        self.updated_at = now

    def complete(self, user_email: str):
        if not self.move_status or not self.final_breadcrumbs:
            raise ValueError('Нельзя завершить без статуса и крошек')
        now = timezone.now()
        self.priority_raw = 'Средний'
        self.completed_by = user_email
        self.completed_at = now
        self.is_completed = True
        self.updated_at = now

    def touch(self):
        self.updated_at = timezone.now()
