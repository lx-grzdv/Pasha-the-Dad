# ADR 004: Limb mechanic and task pile

## Status

Accepted

## Context

Ключевая фантазия: Паша занят детьми, бьёт ногами; освобождение рук — риск. Поражение — завал задачами.

## Decision

- `HandStateSystem` с Q/E/R
- `LimbHitbox` с разными параметрами per limb
- `TaskPileSystem` — пропущенные задачи копятся визуально
- `DefeatSequence` — лавина перед ResultScene

## Consequences

- Сложнее чем «один предмет», но уникальнее
- Визуальная причинно-следственная связь при проигрыше
