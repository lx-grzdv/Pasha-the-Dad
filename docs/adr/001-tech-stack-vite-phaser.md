# ADR 001: Tech stack Vite + Phaser

## Status

Accepted

## Context

Нужна браузерная 2D-аркада с быстрой итерацией и деплоем на Vercel.

## Decision

- **Vite** — сборка и dev server
- **TypeScript** — типизация
- **Phaser 3** — 2D-движок, сцены, твины, input

## Consequences

- Статический билд, без SSR
- Placeholder-графика через Phaser primitives
- Хорошая документация и экосистема
