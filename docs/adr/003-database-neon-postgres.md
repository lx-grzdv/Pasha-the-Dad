# ADR 003: Neon Postgres для глобального рейтинга

## Status

Accepted

## Context

MVP использовал `LocalLeaderboard` (ADR 002). Игра деплоится на Vercel; нужен общий рейтинг между устройствами без блокировки релиза.

## Decision

- **БД:** Neon Postgres через Vercel Marketplace (`POSTGRES_URL` auto-injected).
- **API:** Vercel Serverless Functions в `api/leaderboard/runs.ts` (GET/POST).
- **Клиент:** `HybridLeaderboard` по умолчанию — пишет в localStorage и синхронизирует с API; читает с сервера, fallback на local.
- **Адаптеры:** `VITE_LEADERBOARD_ADAPTER=hybrid|local|remote`.

Supabase отложен: для MVP достаточно одной таблицы `runs` без auth.

## Consequences

- Нужно один раз выполнить `sql/init.sql` в Neon после подключения storage.
- Без `POSTGRES_URL` игра работает как раньше (local-only).
- Базовая валидация score на сервере; полноценный anti-cheat — позже.
