from __future__ import annotations

import shutil
from pathlib import Path

from django.core.management.base import BaseCommand

REQUIRED_KEYS = [
    'DEBUG',
    'DATA_SOURCE',
    'DATABASE_URL',
    'GAS_BASE_URL',
    'SHEET_SPREADSHEET_ID',
    'SHEET_RANGE',
    'JWT_SECRET',
    'TZ',
    'AUTO_SYNC_ENABLED',
    'SUGGESTIONS_HTTP_ENDPOINT',
]


class Command(BaseCommand):
    help = 'Создает .env из примера и проверяет обязательные ключи'

    def handle(self, *args, **options):
        base_dir = Path('.')
        env_file = base_dir / '.env'
        example_file = base_dir / '.env.example'

        if not env_file.exists():
            if not example_file.exists():
                self.stderr.write('Файл .env.example не найден')
                return
            shutil.copy(example_file, env_file)
            self.stdout.write(self.style.SUCCESS('Создан .env из .env.example'))

        data = self._read_env(env_file)
        missing = [key for key in REQUIRED_KEYS if key not in data]
        if missing:
            with env_file.open('a', encoding='utf-8') as fp:
                for key in missing:
                    fp.write(f'\n{key}=')
            self.stdout.write(self.style.WARNING(f'Добавлены отсутствующие ключи: {", ".join(missing)}'))
        else:
            self.stdout.write(self.style.SUCCESS('Все обязательные ключи присутствуют'))

    def _read_env(self, path: Path) -> dict:
        data: dict[str, str] = {}
        with path.open('r', encoding='utf-8') as fp:
            for line in fp:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    data[key.strip()] = value.strip()
        return data
