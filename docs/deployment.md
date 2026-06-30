# Деплой на Vercel

## Конфигурация

Проект — Vite + Phaser SPA + Serverless API. Файл [`vercel.json`](../vercel.json):

- Build: `npm run build`
- Output: `dist`
- API: `api/` (Serverless Functions)
- Rewrite: все остальные маршруты → `/index.html`

## Чеклист

1. Залить репозиторий на GitHub/GitLab
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. Framework Preset: **Vite**
4. Build Command: `npm run build` (default)
5. Output Directory: `dist`
6. Deploy → проверить preview URL
7. Promote to Production на main branch

## Глобальный рейтинг (Neon Postgres)

1. Vercel → **Storage** → Create Database → **Neon Postgres**
2. Connect to project → redeploy (появится `POSTGRES_URL`)
3. Neon → SQL Editor → выполнить [`sql/init.sql`](../sql/init.sql)
4. Проверить: `GET https://<your-domain>/api/leaderboard/runs?limit=1` → `200` и `{ "runs": [] }`

Подробнее: [leaderboard.md](leaderboard.md)

## Env (опционально)

| Переменная | Когда |
|------------|-------|
| `POSTGRES_URL` | Auto от Neon integration |
| `VITE_LEADERBOARD_ADAPTER=local` | Принудительно local-only |

## Локальная проверка билда

```bash
npm run build
npm run preview
```

С API и БД:

```bash
npx vercel dev
```

## Preview deployments

Каждый PR получает свой preview URL — удобно тестировать перед merge.
