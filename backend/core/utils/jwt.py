from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken


@dataclass
class JWTUserPayload:
    sub: str
    role: str

    @classmethod
    def from_user(cls, user: Any) -> "JWTUserPayload":
        return cls(sub=str(user.pk), role=user.role)


def build_access_token(user: Any) -> str:
    token = AccessToken()
    token["sub"] = str(user.pk)
    token["email"] = user.email
    token["role"] = user.role
    token["display_name"] = user.display_name
    return str(token)


def decode_token(raw_token: str) -> AccessToken:
    return AccessToken(raw_token)


def get_cookie_settings() -> dict[str, Any]:
    return {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "max_age": int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
    }
