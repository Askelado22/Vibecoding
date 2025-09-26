from django.urls import path

from .views import SuggestionListView, SuggestionUploadView

urlpatterns = [
    path("admin/suggestions/upload", SuggestionUploadView.as_view(), name="suggestion-upload"),
    path("admin/suggestions", SuggestionListView.as_view(), name="suggestion-list"),
]
