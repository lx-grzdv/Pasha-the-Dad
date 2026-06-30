# Деплой на Vercel

## Конфигурация

Проект — статический SPA (Vite + Phaser). Файл [`vercel.json`](../vercel.json):

- Build: `npm run build`
- Output: `dist`
- Rewrite: все маршруты → `/index.html`

## Чеклист

1. Залить репозиторий на GitHub/GitLab
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. Framework Preset: **Vite**
4. Build Command: `npm run build` (default)
5. Output Directory: `dist`
6. Deploy → проверить preview URL
7. Promote to Production на main branch

## Env (когда подключите БД)

В Vercel → Settings → Environment Variables:

```
VITE_LEADERBOARD_ADAPTER=remote
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

До подключения БД переменные **не нужны**.

## Локальная проверка билда

```bash
npm run build
npm run preview
```

## Preview deployments

Каждый PR получает свой preview URL — удобно тестировать перед merge.
