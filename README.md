# GGSEL Разбор товаров — Django + DRF

Бэкенд-сервис для разбора карточек товаров GGSEL. API обеспечивает авторизацию по ролям, работу с очередью товаров, подсказки путей, скрейпинг карточек, синхронизацию с Google Sheets и вспомогательные команды.

## Стек

- Python 3.11+
- Django 4.x + Django REST Framework
- drf-spectacular для OpenAPI
- SQLite (по умолчанию) либо любая совместимая БД через `DATABASE_URL`

## Быстрый старт

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py ensure_env
python manage.py migrate
python manage.py seed
python manage.py runserver
```

После запуска документация доступна на [`/api/docs/`](http://127.0.0.1:8000/api/docs/) (Swagger-UI), схема — на `/api/schema/`.

Встроенный веб-интерфейс для работы с карточками доступен на корневом пути [`/`](http://127.0.0.1:8000/).

## Веб-интерфейс

Интерфейс разделён на три вкладки:

- **Рабочий стол** — очередь товаров, PathBuilder, подсказки и панель действий. Здесь можно:
  - авторизоваться (логин по email/паролю, используется JWT-кука);
  - просматривать очередь карточек, подтягивать описание с GGSEL, копировать ссылку;
  - собирать финальные крошки с подсказками и валидируемыми справочниками;
  - редактировать статус, комментарий и запускать завершение карточки при выполненных условиях;
  - переходить к предыдущей/следующей карточке.
- **Администрирование** — ручной запуск синка и переключатель автосинка (доступно только роли `admin`). Отображает последние времена pull/push и статус.
- **Справка** — краткая инструкция по шагам и ссылка на Swagger.

Комментарий редактируется в нижнем выдвижном окне, а нижняя панель содержит основные действия и прогресс `N из M`. Все запросы выполняются поверх публичного API, поэтому можно работать и из UI, и напрямую.

## Переменные окружения

Пример — `.env.example`. Команда `python manage.py ensure_env` создаёт `.env` и добавляет обязательные ключи.

- `DATA_SOURCE` — текущий источник данных (db/sheets).
- `DATABASE_URL` — строка подключения (`sqlite:///dev.db` по умолчанию).
- `GAS_BASE_URL` — URL скрипта Google Apps Script.
- `SHEET_SPREADSHEET_ID`, `SHEET_RANGE` — идентификатор таблицы и диапазон.
- `JWT_SECRET` — секрет подписи JWT.
- `TZ` — часовой пояс (используем `Europe/Moscow`).
- `AUTO_SYNC_ENABLED` — включает фоновый автосинк (true/false).
- `SUGGESTIONS_HTTP_ENDPOINT` — внешний сервис подсказок (необязательно).

## Роли и учётные записи (seed)

| Email | Пароль | Роль |
| --- | --- | --- |
| `admin@example.com` | `password123` | admin |
| `askelwhite22@gmail.com` | `white13` | admin |
| `worker@example.com` | `worker123` | worker |

`admin` имеет доступ к административным эндпоинтам (синк, метрики, загрузка подсказок).

## Основные эндпоинты

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/api/auth/login` | Логин, установка JWT-куки |
| POST | `/api/auth/logout` | Выход, очистка куки |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/items` | Список товаров с фильтрами и пагинацией |
| PATCH | `/api/items/{id}` | Обновление статуса, крошек и комментария |
| POST | `/api/items/{id}/complete` | Завершение товара |
| POST | `/api/items/{id}/assign` | Назначить текущему пользователю |
| POST | `/api/items/{id}/unassign` | Снять назначение |
| GET | `/api/items/next` / `/api/items/prev` | Навигация по личной очереди |
| GET | `/api/items/{id}/suggestions` | Топ-5 подсказок пути |
| POST | `/api/admin/suggestions/upload` | Загрузка подсказок (JSON/CSV) — admin |
| POST | `/api/admin/sync/run` | Ручной синк с Google Sheets — admin |
| POST | `/api/admin/sync/auto` | Вкл/выкл автосинка — admin |
| GET | `/api/admin/metrics` | Метрики активности — admin |
| GET | `/api/fetchProduct?url=` | Скрейпер карточки GGSEL (кэш 15 мин) |

Полный контракт см. в Swagger UI.

## Синхронизация с Google Sheets

Движок `syncapp.services.SyncEngine` реализует pull/merge/push по правилу «последняя запись побеждает» (`updated_at = max(E, H, K)`).

- `python manage.py run_sync` — единичный запуск.
- Автосинк: установить `AUTO_SYNC_ENABLED=true` в `.env`, включить флаг через `/api/admin/sync/auto`.
- Интервал фонового синка — 30 минут. Логи см. в stdout.

## Скрейпер GGSEL

Эндпоинт `/api/fetchProduct` обращается к карточке товара, парсит заголовок, описание, цену, изображения и продавца. Результат кэшируется на 15 минут, действует rate-limit 30 запросов/минуту на пользователя.

## Подсказки пути

`SuggestionService` объединяет локальные записи модели `suggestions.Suggestion` и ответ внешнего HTTP-провайдера (если задан `SUGGESTIONS_HTTP_ENDPOINT`). Ответ нормализуется и ограничивается Top-5.

## Тестовые данные

Команда `python manage.py seed` создаёт несколько товаров с разными статусами и подсказки.

## Часовой пояс и даты

Все даты хранятся в формате ISO 8601 и интерпретируются в часовом поясе `Europe/Moscow`. При синхронизации с Google Sheets время нормализуется к MSK.

## Разработка

- `python manage.py makemigrations` / `migrate` — стандартные миграции.
- `python manage.py runserver` — запуск dev-сервера.
- `python manage.py ensure_env` — проверка `.env`.

## Лицензия

Проект распространяется на условиях MIT (можно дополнить по необходимости).
