from __future__ import annotations

from django.conf import settings
from django.contrib.auth import login, logout
from django.http import HttpRequest
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.jwt import build_access_token, get_cookie_settings

from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        token = build_access_token(user)
        response = Response(UserSerializer(user).data)
        response.set_cookie(settings.JWT_COOKIE_NAME, token, **get_cookie_settings())
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        logout(request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            settings.JWT_COOKIE_NAME,
            samesite=settings.JWT_COOKIE_SAMESITE,
            secure=settings.JWT_COOKIE_SECURE,
        )
        return response


class MeView(APIView):
    def get(self, request: HttpRequest) -> Response:
        return Response(UserSerializer(request.user).data)
