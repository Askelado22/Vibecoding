from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand
from dotenv import dotenv_values

DEFAULT_ENV = {
    "DATA_SOURCE": "db",
    "DATABASE_URL": "sqlite:///dev.db",
    "GAS_BASE_URL": "",
    "SHEET_SPREADSHEET_ID": "",
    "SHEET_RANGE": "Лист1!A:M",
    "JWT_SECRET": "change-me",
    "TZ": "Europe/Moscow",
    "AUTO_SYNC_ENABLED": "false",
    "SUGGESTIONS_HTTP_ENDPOINT": "",
}

REQUIRED = ["DATA_SOURCE", "DATABASE_URL", "JWT_SECRET", "TZ"]


class Command(BaseCommand):
    help = "Ensure that a .env file exists with all required keys"

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[3]
        env_path = base_dir / ".env"
        values = DEFAULT_ENV.copy()
        if env_path.exists():
            current = dotenv_values(env_path)
            values.update({k: v for k, v in current.items() if v is not None})
        missing = [key for key in REQUIRED if not values.get(key)]
        if missing:
            for key in missing:
                values[key] = DEFAULT_ENV.get(key, "")
            self.stdout.write(self.style.WARNING(f"Set default values for missing keys: {', '.join(missing)}"))
        lines = [f"{key}={values.get(key, '')}" for key in DEFAULT_ENV]
        extra_keys = sorted(set(values.keys()) - set(DEFAULT_ENV.keys()))
        for key in extra_keys:
            lines.append(f"{key}={values[key]}")
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Ensured environment file at {env_path}"))
