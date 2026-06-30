# Pasha the D[e]ad

Браузерная 2D-аркада: Паша отбивает летящие задачи, балансирует малыша, дочь и работу — или тонет в куче дел.

**Играть:** https://pasha-the-dad.vercel.app

**Репозиторий:** https://github.com/lx-grzdv/Pasha-the-Dad

## Быстрый старт

```bash
npm install
npm run dev
```

Открой http://localhost:5173

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер Vite |
| `npm run build` | Production-сборка в `dist/` |
| `npm run preview` | Превью production-билда |

## Управление

- **Мышь** — направление удара
- **ЛКМ / Пробел** — удар
- **Q** — подбросить малыша (освободить левую руку)
- **E** — дочь в сад (правая рука)
- **R** — туалет (обе руки, но растёт хаос)

## Стек

- Vite + TypeScript + Phaser 3
- Рейтинг: hybrid (localStorage + Neon Postgres на Vercel)
- Деплой: [Vercel](docs/deployment.md)

## Документация

- [Архитектура](docs/architecture.md)
- [Геймдизайн](docs/game-design.md)
- [Рейтинг](docs/leaderboard.md)
- [Деплой](docs/deployment.md)
- [Бриф](pasha-protiv-dnya-brief.md)

## Env

Скопируй `.env.example` → `.env` при необходимости. По умолчанию env не обязателен — без Postgres рейтинг локальный.

Для глобального рейтинга: подключи Neon в Vercel и выполни `sql/init.sql` — см. [leaderboard.md](docs/leaderboard.md).
