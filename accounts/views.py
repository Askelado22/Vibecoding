from __future__ import annotations

from django.conf import settings
from django.contrib.auth import login, logout
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .authentication import JWT_COOKIE_NAME, create_jwt
from .serializers import LoginSerializer, UserSerializer


COOKIE_MAX_AGE = int(settings.JWT_TTL.total_seconds())
SECURE_COOKIE = not settings.DEBUG


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    token = create_jwt(user)
    login(request, user)
    response = Response(UserSerializer(user).data)
    response.set_cookie(
        JWT_COOKIE_NAME,
        token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=SECURE_COOKIE,
        samesite='Lax',
    )
    return response


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    logout(request)
    response = Response(status=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(JWT_COOKIE_NAME)
    return response


@api_view(['GET'])
def me_view(request):
    return Response(UserSerializer(request.user).data)
