# ADR 002: Leaderboard localStorage first

## Status

Accepted

## Context

БД ещё не выбрана. Рейтинг нужен в MVP, но не должен блокировать релиз.

## Decision

Интерфейс `LeaderboardService` + реализация `LocalLeaderboard` в localStorage. Remote-адаптер — позже.

## Consequences

- Нет глобального рейтинга между устройствами
- UI честно сообщает об этом
- Переключение через env без переписывания сцен
