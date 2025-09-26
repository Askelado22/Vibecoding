from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    path("api/auth/", include("accounts.urls")),
    path("api/items/", include("items.urls")),
    path("api/admin/", include("sync.urls")),
    path("api/", include("scraper.urls")),
    path("api/", include("suggestions.urls")),
]
