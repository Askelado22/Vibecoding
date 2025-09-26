from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

from core.utils.env import get_bool, get_database_config, get_list

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or "change-this-in-production"
DEBUG = get_bool(os.getenv("DEBUG", "false"))
ALLOWED_HOSTS = get_list(os.getenv("ALLOWED_HOSTS", ""))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "django_filters",
    "drf_spectacular",
    "core",
    "accounts",
    "items",
    "suggestions",
    "sync",
    "scraper",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.jwt_auth.JWTAuthenticationMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "backend.wsgi.application"
ASGI_APPLICATION = "backend.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{(BASE_DIR / 'dev.db').as_posix()}"
DATABASES = {
    "default": get_database_config(DATABASE_URL, BASE_DIR),
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

LANGUAGE_CODE = "ru"
TIME_ZONE = os.getenv("TZ", "Europe/Moscow")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "ggsel-backend",
    }
}

REDIS_URL = os.getenv("REDIS_URL")
if REDIS_URL:
    CACHES["default"] = {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "core.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.CustomPageNumberPagination",
    "PAGE_SIZE": 20,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "GGSEL Backend API",
    "DESCRIPTION": "API for GGSEL catalog processing",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = {
    "ALGORITHM": "HS256",
    "SIGNING_KEY": os.getenv("JWT_SECRET", "change-me"),
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

JWT_COOKIE_NAME = "access_token"
JWT_COOKIE_SECURE = get_bool(os.getenv("JWT_COOKIE_SECURE", "false"))
JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")

CSRF_TRUSTED_ORIGINS = get_list(os.getenv("CSRF_TRUSTED_ORIGINS", ""))

AUTO_SYNC_ENABLED_DEFAULT = get_bool(os.getenv("AUTO_SYNC_ENABLED", "false"))
SUGGESTIONS_HTTP_ENDPOINT = os.getenv("SUGGESTIONS_HTTP_ENDPOINT")
GAS_BASE_URL = os.getenv("GAS_BASE_URL", "")
SHEET_SPREADSHEET_ID = os.getenv("SHEET_SPREADSHEET_ID")
SHEET_RANGE = os.getenv("SHEET_RANGE", "Лист1!A:M")
DATA_SOURCE = os.getenv("DATA_SOURCE", "db")

