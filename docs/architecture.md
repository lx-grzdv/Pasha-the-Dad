# Архитектура

## Обзор

```
src/
├── main.ts              # Phaser game bootstrap
├── config/              # Константы, задачи, предметы
├── scenes/              # Phaser scenes (UI flow)
├── entities/            # Pasha, Task визуалы
├── systems/             # Игровая логика
├── services/            # playerStorage, leaderboard
├── types/               # Shared TS types
└── utils/               # resultStatus, helpers
```

## Сцены

| Сцена | Ключ | Назначение |
|-------|------|------------|
| BootScene | BootScene | Старт → Menu |
| MenuScene | MenuScene | Имя, предмет, START |
| GameScene | GameScene | Основной геймплей 180с |
| ResultScene | ResultScene | Итог, submit в рейтинг |
| LeaderboardScene | LeaderboardScene | Топ забегов |

## Системы (GameScene)

- **HandStateSystem** — занятость рук, Q/E/R, кулдауны
- **MeterSystem** — 5 шкал, пассивный drain, критический fail
- **ScoringSystem** + **ComboSystem** — очки и комбо
- **DifficultyRamp** — spawn rate по времени и хаосу
- **TaskSpawnSystem** — спавн задач с краёв экрана
- **TaskPileSystem** — куча пропущенных задач, sink Паши
- **DefeatSequence** — лавина при поражении

## Сервисы

- `playerStorage` — uuid и имя в localStorage
- `LeaderboardService` — интерфейс; `LocalLeaderboard`, `RemoteLeaderboard`, `HybridLeaderboard` (default)
- API: `api/leaderboard/runs.ts` → Neon Postgres

## Поток данных

```
MenuScene → GameSessionConfig → GameScene → RunResult → ResultScene
                                                      → LeaderboardService
```
