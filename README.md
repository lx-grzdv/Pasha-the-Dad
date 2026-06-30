# Pasha the D[e]ad

Браузерная 2D-аркада: Паша отбивает летящие задачи, балансирует малыша, дочь и работу — или тонет в куче дел.

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
- Рейтинг: localStorage (MVP)
- Деплой: [Vercel](docs/deployment.md)

## Документация

- [Архитектура](docs/architecture.md)
- [Геймдизайн](docs/game-design.md)
- [Рейтинг](docs/leaderboard.md)
- [Деплой](docs/deployment.md)
- [Бриф](pasha-protiv-dnya-brief.md)

## Env

Скопируй `.env.example` → `.env` когда подключите БД. Сейчас env не обязателен.
