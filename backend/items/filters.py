from __future__ import annotations

import django_filters
from django.db.models import Q

from .models import Item


class ItemFilter(django_filters.FilterSet):
    has_breadcrumbs = django_filters.BooleanFilter(method="filter_has_breadcrumbs")
    move_status_set_at_after = django_filters.IsoDateTimeFilter(field_name="move_status_set_at", lookup_expr="gte")
    move_status_set_at_before = django_filters.IsoDateTimeFilter(field_name="move_status_set_at", lookup_expr="lte")
    breadcrumbs_set_at_after = django_filters.IsoDateTimeFilter(field_name="breadcrumbs_set_at", lookup_expr="gte")
    breadcrumbs_set_at_before = django_filters.IsoDateTimeFilter(field_name="breadcrumbs_set_at", lookup_expr="lte")
    completed_at_after = django_filters.IsoDateTimeFilter(field_name="completed_at", lookup_expr="gte")
    completed_at_before = django_filters.IsoDateTimeFilter(field_name="completed_at", lookup_expr="lte")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Item
        fields = {
            "assignee_name": ["exact"],
            "move_status": ["exact"],
            "is_completed": ["exact"],
        }

    def filter_has_breadcrumbs(self, queryset, name, value):
        if value is None:
            return queryset
        if value:
            return queryset.exclude(final_breadcrumbs="")
        return queryset.filter(final_breadcrumbs="")

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(product_url__icontains=value)
            | Q(final_breadcrumbs__icontains=value)
            | Q(comment__icontains=value)
        )
