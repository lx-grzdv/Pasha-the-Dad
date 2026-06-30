import type { RunResult } from '../types/game';

const STATUSES_WIN = [
  'Вылез из-под завала',
  'Still alive (barely)',
  'Паша почти победил день',
  'Отец года, но лучше прилечь',
];

const STATUSES_LOSE = [
  'D[e]ad under the pile',
  'Завалило делами',
  'День победил, но с трудом',
  'Pasha is dead tired',
];

export function computeResultStatus(result: Omit<RunResult, 'resultStatus'>): string {
  const pool = result.won ? STATUSES_WIN : STATUSES_LOSE;
  const minMeter = Math.min(result.babyFinal, result.daughterFinal, result.workFinal, result.energyFinal);

  if (result.won && minMeter < 20) return 'Отец года, но лучше прилечь';
  if (!result.won && result.survivalTime > 150) return 'Почти выжил';
  if (!result.won && result.babyFinal <= 0) return 'Малыш не дождался';
  if (!result.won && result.workFinal <= 0) return 'Работа спасена, Паша нет';

  return pool[Math.floor(Math.random() * pool.length)];
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
