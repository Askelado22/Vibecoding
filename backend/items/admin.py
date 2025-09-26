from django.contrib import admin

from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("product_url", "assignee_name", "move_status", "is_completed", "updated_at")
    search_fields = ("product_url", "assignee_name", "final_breadcrumbs")
    list_filter = ("move_status", "is_completed")
