from django.contrib import admin

from .models import Suggestion


@admin.register(Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    list_display = ("path", "score", "source", "created_at")
    search_fields = ("path",)
    list_filter = ("source",)
