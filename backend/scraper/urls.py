from django.urls import path

from .views import FetchProductView

urlpatterns = [
    path("fetchProduct", FetchProductView.as_view(), name="fetch-product"),
]
