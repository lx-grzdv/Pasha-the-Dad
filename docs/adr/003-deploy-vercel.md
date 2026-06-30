# ADR 003: Deploy on Vercel

## Status

Accepted

## Context

Нужен простой хостинг для статической SPA с preview на PR.

## Decision

Vercel + `vercel.json` с SPA rewrite.

## Consequences

- Zero-config для Vite
- Env для будущей БД через Vercel dashboard
- Serverless functions — опционально для API рейтинга
