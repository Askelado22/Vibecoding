from django.urls import path

from .views import ItemSuggestionsView, SuggestionUploadView

urlpatterns = [
    path('items/<int:item_id>/suggestions', ItemSuggestionsView.as_view(), name='item-suggestions'),
    path('admin/suggestions/upload', SuggestionUploadView.as_view(), name='suggestions-upload'),
]
