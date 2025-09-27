from __future__ import annotations

from typing import Optional, Tuple

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import authentication, exceptions

User = get_user_model()

JWT_COOKIE_NAME = 'ggsel_jwt'


def create_jwt(user: User) -> str:
    payload = {
        'sub': str(user.pk),
        'email': user.email,
        'role': user.role,
        'exp': timezone.now() + settings.JWT_TTL,
        'iat': timezone.now(),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')
    return token


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError as exc:
        raise exceptions.AuthenticationFailed('Токен истек') from exc
    except jwt.InvalidTokenError as exc:
        raise exceptions.AuthenticationFailed('Невалидный токен') from exc


class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request) -> Optional[Tuple[User, None]]:
        token = request.COOKIES.get(JWT_COOKIE_NAME)
        if not token:
            return None
        payload = decode_jwt(token)
        try:
            user = User.objects.get(pk=payload['sub'])
        except User.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed('Пользователь не найден') from exc
        return user, None

    def authenticate_header(self, request):
        return 'Cookie'
