import type { ApartmentGame } from './game';

/** Достижения и звания: локальная геймификация без сервера. */
export interface Achievement {
  id: string;
  icon: string;
  title: string;
  hint: string;
  check: (game: ApartmentGame) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-day', icon: '🌅', title: 'Первый день', hint: 'Дожить до вечера', check: (g) => g.phase === 'won' },
  { id: 'streak-10', icon: '🔥', title: 'В ударе', hint: '10 забот подряд', check: (g) => g.stats.bestStreak >= 10 },
  { id: 'streak-20', icon: '⚡', title: 'Папа-ниндзя', hint: '20 забот подряд', check: (g) => g.stats.bestStreak >= 20 },
  { id: 'butt-5', icon: '🍑', title: 'Пятая точка', hint: '5 ударов попой за день', check: (g) => g.stats.hitsByLimb.butt >= 5 },
  { id: 'jump-8', icon: '🦘', title: 'Прыгучий', hint: '8 ударов носом в прыжке', check: (g) => g.stats.hitsByLimb.jump >= 8 },
  { id: 'kick-8', icon: '🦵', title: 'Каратист в тапках', hint: '8 пинков за день', check: (g) => g.stats.hitsByLimb.foot >= 8 },
  { id: 'fart-3', icon: '💨', title: 'Газовая атака', hint: 'Пукнуть трижды за день', check: (g) => g.stats.farts >= 3 },
  { id: 'clean-2', icon: '🧼', title: 'Чистюля', hint: 'Два бонуса за чистые 45 секунд', check: (g) => g.stats.cleanBonuses >= 2 },
  { id: 'no-miss', icon: '🎯', title: 'Ни одной мимо', hint: 'Победить без пропусков', check: (g) => g.phase === 'won' && g.scoring.tasksMissed === 0 },
  { id: 'balanced', icon: '⚖️', title: 'Баланс', hint: 'Победить со всеми шкалами выше 50', check: (g) => g.phase === 'won' && Math.min(g.meters.values.baby, g.meters.values.daughter, g.meters.values.work, g.meters.values.energy) > 50 },
  { id: 'score-5000', icon: '🏅', title: 'Пять тысяч', hint: '5000 очков за день', check: (g) => g.scoring.score >= 5000 },
  { id: 'score-8000', icon: '🏆', title: 'Легенда двора', hint: '8000 очков за день', check: (g) => g.scoring.score >= 8000 },
  { id: 'hands-off', icon: '🙌', title: 'Без рук', hint: 'Победить, не используя способности', check: (g) => g.phase === 'won' && g.stats.abilitiesUsed === 0 },
];

const KEY = 'pasha-apartment-3d-achievements';

export function loadUnlocked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Проверяет условия после забега; возвращает только новые достижения. */
export function evaluateAchievements(game: ApartmentGame, unlocked: Set<string>): Achievement[] {
  const fresh = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(game));
  for (const a of fresh) unlocked.add(a.id);
  if (fresh.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify([...unlocked]));
    } catch {
      /* Хранилище необязательно. */
    }
  }
  return fresh;
}

const RANKS: [number, string][] = [
  [8000, 'Легенда двора'],
  [5000, 'Папа-ниндзя'],
  [3000, 'Многорукий папа'],
  [1500, 'Папа на связи'],
  [0, 'Папа-стажёр'],
];

export function rankFor(score: number): string {
  return RANKS.find(([min]) => score >= min)?.[1] ?? RANKS[RANKS.length - 1][1];
}

/** Сколько очков до следующего звания; null — уже максимум. */
export function nextRank(score: number): { title: string; missing: number } | null {
  const next = [...RANKS].reverse().find(([min]) => min > score);
  return next ? { title: next[1], missing: next[0] - score } : null;
}
