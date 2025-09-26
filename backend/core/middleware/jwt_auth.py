from __future__ import annotations

from typing import Any, Callable

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpRequest, HttpResponse
from rest_framework_simplejwt.exceptions import InvalidToken

from core.utils.jwt import decode_token

User = get_user_model()


class JWTAuthenticationMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        token = request.COOKIES.get(settings.JWT_COOKIE_NAME)
        if token and not getattr(request, "user", None).is_authenticated:
            try:
                validated = decode_token(token)
                user_id = validated.get("sub")
                if user_id:
                    try:
                        user = User.objects.get(pk=user_id, is_active=True)
                    except User.DoesNotExist:
                        user = None
                    if user:
                        request.user = user
            except InvalidToken:
                pass
        return self.get_response(request)
