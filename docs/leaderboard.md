# Рейтинг и storage

## MVP: LocalLeaderboard

- Ключ localStorage: `pasha_dead_runs`
- Хранит до 500 забегов, сортировка по score
- UI показывает плашку «рейтинг на этом устройстве»

## Интерфейс LeaderboardService

```typescript
interface LeaderboardService {
  submitRun(run: RunRecord): Promise<void>;
  getTopRuns(limit: number): Promise<RunRecord[]>;
  getTodayTopRuns(limit: number): Promise<RunRecord[]>;
  getPlayerBest(playerId: string): Promise<RunRecord | null>;
}
```

Переключение адаптера: `VITE_LEADERBOARD_ADAPTER=local|remote`

## Будущая схема БД (из брифа)

### players

```sql
players (
  id uuid primary key,
  name text,
  created_at timestamp
)
```

### runs

```sql
runs (
  id uuid primary key,
  player_id uuid,
  player_name text,
  pasha_type text,
  item_type text,
  score integer,
  survival_time integer,
  tasks_deflected integer,
  tasks_missed integer,
  max_chaos_level integer,
  baby_final integer,
  daughter_final integer,
  work_final integer,
  energy_final integer,
  result_status text,
  game_version text,
  created_at timestamp
)
```

## Кандидаты БД (решение отложено)

| Вариант | Когда выбрать |
|---------|---------------|
| Supabase | быстрый старт, anon RLS |
| Vercel Postgres | всё в одном месте с деплоем |
| Turso | edge SQLite |

При выборе: ADR `docs/adr/00N-database-choice.md` + `RemoteLeaderboard` adapter.
