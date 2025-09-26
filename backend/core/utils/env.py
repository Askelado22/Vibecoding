from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


def get_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "y", "on"}


def get_list(value: str | None, separator: str = ",") -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(separator) if part.strip()]


def get_database_config(url: str, base_dir: Path) -> dict:
    parsed = urlparse(url)
    scheme = parsed.scheme
    if scheme.startswith("sqlite"):
        path = parsed.path or ""
        if path.startswith("/"):
            db_path = Path(path[1:]) if path.startswith("//") else Path(path[1:])
        else:
            db_path = Path(path)
        if not db_path.is_absolute():
            db_path = base_dir / db_path
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": db_path,
        }
    if scheme in {"postgres", "postgresql", "postgresql+psycopg"}:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": (parsed.path or "")[1:] or "postgres",
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "localhost",
            "PORT": parsed.port or "5432",
        }
    raise ValueError(f"Unsupported DATABASE_URL scheme: {scheme}")


def require_env(keys: Iterable[str]) -> dict[str, str]:
    missing = [key for key in keys if not os.getenv(key)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    return {key: os.environ[key] for key in keys}
