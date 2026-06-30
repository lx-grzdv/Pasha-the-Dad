# Рейтинг и storage

## Режимы

| Адаптер | Env | Поведение |
|---------|-----|-----------|
| `hybrid` (default) | — | localStorage + sync в Postgres через API |
| `local` | `VITE_LEADERBOARD_ADAPTER=local` | только это устройство |
| `remote` | `VITE_LEADERBOARD_ADAPTER=remote` | только сервер |

## LocalLeaderboard

- Ключ localStorage: `pasha_dead_runs`
- Хранит до 500 забегов, сортировка по score

## RemoteLeaderboard / API

- `POST /api/leaderboard/runs` — сохранить забег
- `GET /api/leaderboard/runs?limit=10` — топ за всё время
- `GET /api/leaderboard/runs?limit=5&period=today` — топ за сегодня
- `GET /api/leaderboard/runs?playerId=<uuid>&limit=1` — лучший забег игрока

## Интерфейс LeaderboardService

```typescript
interface LeaderboardService {
  submitRun(run: RunRecord): Promise<void>;
  getTopRuns(limit: number): Promise<RunRecord[]>;
  getTodayTopRuns(limit: number): Promise<RunRecord[]>;
  getPlayerBest(playerId: string): Promise<RunRecord | null>;
}
```

## Схема БД (Neon Postgres)

См. [`sql/init.sql`](../sql/init.sql). Таблица `runs` — поля совпадают с `RunRecord`.

## Подключение на Vercel

1. Vercel Dashboard → Storage → Create Database → **Neon Postgres**
2. Привязать к проекту `pasha-the-dead` — появится `POSTGRES_URL`
3. Neon SQL Editor → выполнить `sql/init.sql`
4. Redeploy

Клиентский env **не нужен** — `HybridLeaderboard` сам найдёт API.

## Локальная разработка с БД

```bash
npx vercel env pull .env.local
# добавить POSTGRES_URL в окружение
npx vercel dev
```

Без `vercel dev` API недоступен — hybrid откатывается на localStorage.
