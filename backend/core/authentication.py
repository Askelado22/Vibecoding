from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request
from rest_framework_simplejwt.exceptions import InvalidToken

from core.utils.jwt import decode_token

User = get_user_model()


class CookieJWTAuthentication(BaseAuthentication):
    def authenticate(self, request: Request):
        token = request.COOKIES.get(settings.JWT_COOKIE_NAME)
        if not token:
            return None
        try:
            validated = decode_token(token)
        except InvalidToken as exc:  # pragma: no cover - token errors
            raise AuthenticationFailed("Invalid token") from exc
        user_id = validated.get("sub")
        if not user_id:
            raise AuthenticationFailed("Invalid token payload")
        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed("User not found") from exc
        return user, None
