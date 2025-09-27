from __future__ import annotations

from django.contrib.auth.models import AnonymousUser

from .authentication import JWTAuthentication


def get_user_from_request(request):
    auth = JWTAuthentication()
    try:
        result = auth.authenticate(request)
    except Exception:
        result = None
    if result is None:
        return AnonymousUser()
    user, _ = result
    return user


class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not hasattr(request, 'user') or request.user.is_anonymous:
            request.user = get_user_from_request(request)
        response = self.get_response(request)
        return response
