# Changelog

## [0.2.1] — 2026-07-01

### Added

- Управление стрелками: направление удара без мыши (`AimInput`)
- Конкретные конечности: левая/правая нога и рука — выбор по курсору
- Пах-комбо (MJ-thrust): чередование ног, бонус +25% / +50%, анимация pelvic thrust
- `ThrustComboSystem`, ноги у `PashaVisual`

## [0.2.0] — 2026-07-01

### Added

- Глобальный рейтинг: API `/api/leaderboard/runs` + Neon Postgres
- `HybridLeaderboard` — localStorage + sync на сервер (default)
- `RemoteLeaderboard`, SQL-схема `sql/init.sql`
- ADR 003: выбор Neon Postgres

## [0.1.1] — 2026-07-01

### Added

- `TaskSpawnSystem`, `LimbHitbox` как отдельные модули
- Всплывающие фразы (отбивание, пропуск, комбо, низкие шкалы)
- Вспышка при ударе, подсветка готовых кулдаунов Q/E/R
- При поражении летящие задачи липнут к куче перед лавиной

### Docs

- Production URL в README и `docs/deployment.md`

## [0.1.0] — 2026-07-01

### Added

- MVP «Pasha the D[e]ad»: Phaser-аркада с механикой занятых рук/ног
- 12 типов задач (baby, daughter, work, chaos)
- 5 шкал состояния + куча пропущенных задач
- Анимация поражения «тонет в делах»
- Экраны: Menu, Game, Result, Leaderboard
- LocalLeaderboard (localStorage)
- Деплой-конфиг Vercel
- Документация и Cursor rule
