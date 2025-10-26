from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/auth/', include('accounts.urls')),
    path('api/items/', include('items.urls')),
    path('api/', include('suggestions.urls')),
    path('api/', include('syncapp.urls')),
    path('', RedirectView.as_view(pattern_name='docs', permanent=False)),
]
