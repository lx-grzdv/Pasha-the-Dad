import { MeterSystem } from '../systems/MeterSystem';
import { HandStateSystem } from '../systems/HandStateSystem';
import { ScoringSystem } from '../systems/ScoringSystem';
import { TASK_DEFINITIONS, type TaskDefinition, type TaskType } from '../config/tasks';
import { COMBO_THRESHOLDS, DURATIONS, RUN_DURATION_SEC, WAVES } from '../config/gameConfig';
import { ITEMS } from '../config/pashaTypes';

export type Phase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type AbilityKey = 'q' | 'e' | 'r' | 'f';

/** Папа пукнул: старшая разбегается, правая рука свободна. */
export const FART = { duration: 5000, cooldown: 20000, chaos: 0.6 } as const;
/**
 * Чем Паша отбивает заботу. Свободные руки бьют сильнее всего; когда руки
 * заняты детьми, в ход идут нос (с прыжком, если забота летит сверху),
 * ноги для нижних карточек и попа с головой для боковых.
 */
export type Limb = 'head' | 'leftHand' | 'rightHand' | 'bothHands' | 'jump' | 'foot' | 'butt';
export type LaneDirection = 'above' | 'side' | 'below';

export const LANE_COUNT = 6;
/** Самый длинный шаг симуляции: защита от скачка после свёрнутой вкладки. */
export const MAX_STEP = 0.25;

export interface FlyingTask {
  id: number;
  definition: TaskDefinition;
  /** Секунд в полёте. */
  age: number;
  /** Секунд до попадания в Пашу. */
  duration: number;
  lane: number;
  hp: number;
}

export type GameEvent =
  | { type: 'spawn'; task: FlyingTask }
  | { type: 'miss'; task: FlyingTask }
  | { type: 'wave'; label: string }
  | { type: 'streak'; streak: number; multiplier: number }
  | { type: 'bonus'; label: string; points: number }
  | { type: 'finish'; won: boolean };

export type GameMode = 'daily' | 'free';

/** Секунд без единого пропуска, за которые начисляется бонус «чистая минута». */
export const CLEAN_STREAK_SEC = 45;
export const CLEAN_STREAK_BONUS = 250;

/** Статистика забега для достижений и таблицы. */
export interface RunStats {
  hitsByLimb: Record<Limb, number>;
  farts: number;
  bestStreak: number;
  cleanBonuses: number;
  abilitiesUsed: number;
}

function emptyStats(): RunStats {
  return {
    hitsByLimb: { head: 0, leftHand: 0, rightHand: 0, bothHands: 0, jump: 0, foot: 0, butt: 0 },
    farts: 0,
    bestStreak: 0,
    cleanBonuses: 0,
    abilitiesUsed: 0,
  };
}

/** Детерминированный генератор: у «задачи дня» одинаковая раздача у всех. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailySeed(date = new Date()): number {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export interface AttackResult {
  result: 'none' | 'partial' | 'hit';
  /** Фактическая прибавка счёта из ScoringSystem с учётом комбо и тапка. */
  delta: number;
  limb: Limb;
}

export const LIMB_POWER: Record<Limb, number> = {
  head: 0.9,
  leftHand: 1,
  rightHand: 1,
  bothHands: 1.3,
  jump: 1,
  foot: 0.7,
  butt: 0.75,
};

export const LIMB_LABEL: Record<Limb, string> = {
  head: 'носом',
  leftHand: 'левой рукой',
  rightHand: 'правой рукой',
  bothHands: 'двумя руками',
  jump: 'носом в прыжке',
  foot: 'ногой',
  butt: 'попой',
};

/** Откуда летит карточка по номеру дорожки: 1 и 2 сверху, 4 и 5 снизу. */
export const LANE_DIRECTION: LaneDirection[] = ['side', 'above', 'above', 'side', 'below', 'below'];

const FAILURE_TEXT = {
  baby: 'Малышу нужно больше внимания.',
  daughter: 'Дочка очень соскучилась.',
  work: 'Рабочий день вышел из-под контроля.',
  energy: 'Папе нужен отдых.',
};

const CHAOS_TEXT = 'Дом утонул в заботах.';

interface PendingWave {
  type: TaskType;
  count: number;
}

export class ApartmentGame {
  meters = new MeterSystem();
  hands = new HandStateSystem();
  scoring = new ScoringSystem();
  phase: Phase = 'ready';
  elapsed = 0;
  tasks: FlyingTask[] = [];
  events: GameEvent[] = [];
  reason = '';
  mode: GameMode = 'free';
  stats: RunStats = emptyStats();
  /** Счёт на каждой прошедшей секунде: «призрак» рекорда для темпа. */
  history: number[] = [];
  abilityEnds = { q: 0, e: 0, r: 0, f: 0 };
  private sinceMiss = 0;
  private lastMultiplier = 1;
  private fartCooldownEnd = 0;
  /** Подменяется в тестах для детерминированности. */
  random: () => number = Math.random;

  private nextSpawn = 0;
  private nextId = 1;
  private pendingWave: PendingWave | null = null;
  private firedWaves = new Set<number>();
  private sideHits = 0;

  get now(): number {
    return this.elapsed * 1000;
  }

  get timeLeft(): number {
    return Math.max(0, RUN_DURATION_SEC - this.elapsed);
  }

  /** Полный сброс к стартовому экрану без запуска забега. */
  reset(): void {
    this.meters.reset();
    this.hands.reset();
    this.scoring.reset();
    this.phase = 'ready';
    this.elapsed = 0;
    this.tasks = [];
    this.events = [];
    this.reason = '';
    this.abilityEnds = { q: 0, e: 0, r: 0, f: 0 };
    this.fartCooldownEnd = 0;
    this.stats = emptyStats();
    this.history = [];
    this.sinceMiss = 0;
    this.lastMultiplier = 1;
    this.nextSpawn = 0.7;
    this.nextId = 1;
    this.pendingWave = null;
    this.firedWaves.clear();
    this.sideHits = 0;
  }

  /** Свободный день — обычный Math.random; задача дня — общий сид на дату. */
  start(mode: GameMode = 'free', seed = dailySeed()): void {
    this.reset();
    this.mode = mode;
    this.random = mode === 'daily' ? seededRandom(seed) : Math.random;
    this.phase = 'playing';
  }

  pause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
  }

  resume(): void {
    if (this.phase === 'paused') this.phase = 'playing';
  }

  /** Старшая разбежалась после папиного пука. */
  get scattered(): boolean {
    return this.phase !== 'ready' && this.now < this.abilityEnds.f;
  }

  /** Оставшиеся кулдауны всех способностей в миллисекундах. */
  cooldowns(): Record<AbilityKey, number> {
    return { ...this.hands.getCooldownRemaining(this.now), f: Math.max(0, this.fartCooldownEnd - this.now) };
  }

  /** Свободная рука, если есть: ею Паша бьёт независимо от направления. */
  freeHand(): Limb | null {
    const { leftHandFree } = this.hands.state;
    const rightHandFree = this.hands.state.rightHandFree || this.scattered;
    if (leftHandFree && rightHandFree) return 'bothHands';
    if (leftHandFree) return 'leftHand';
    if (rightHandFree) return 'rightHand';
    return null;
  }

  /** Какой конечностью Паша отобьёт заботу с этой дорожки. */
  limbFor(lane: number): Limb {
    const hand = this.freeHand();
    if (hand) return hand;
    const direction = LANE_DIRECTION[lane] ?? 'side';
    if (direction === 'above') return 'jump';
    if (direction === 'below') return 'foot';
    return this.sideHits % 2 ? 'butt' : 'head';
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;
    dt = Math.min(Math.max(dt, 0), MAX_STEP);
    this.elapsed += dt;
    this.hands.update(this.now);
    this.meters.tick(dt, this.hands.state);
    this.meters.values.energy = Math.min(100, this.meters.values.energy + dt * 0.85);

    this.updateWaves();
    this.updateSpawning(dt);
    this.updateFlight(dt);
    this.updateCleanStreak(dt);
    while (this.history.length < Math.floor(this.elapsed)) this.history.push(this.scoring.score);
    this.checkEnding();
  }

  private updateCleanStreak(dt: number): void {
    this.sinceMiss += dt;
    if (this.sinceMiss < CLEAN_STREAK_SEC) return;
    this.sinceMiss = 0;
    this.scoring.score += CLEAN_STREAK_BONUS;
    this.stats.cleanBonuses++;
    this.events.push({ type: 'bonus', label: 'ЧИСТЫЕ 45 СЕКУНД', points: CLEAN_STREAK_BONUS });
  }

  attack(id: number): AttackResult {
    const none: AttackResult = { result: 'none', delta: 0, limb: 'head' };
    if (this.phase !== 'playing') return none;
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return none;
    const limb = this.limbFor(task.lane);
    if (limb === 'head' || limb === 'butt') this.sideHits++;

    this.meters.onHit(0.4);
    task.hp--;
    if (task.hp > 0) return { result: 'partial', delta: 0, limb };

    const { definition } = task;
    this.meters.onTaskDeflected(definition.type, 0.35);
    if (definition.type === 'chaos') {
      this.meters.values.chaos = Math.max(0, this.meters.values.chaos - 0.45);
    }
    const before = this.scoring.score;
    this.scoring.onDeflect(definition, ITEMS.slipper, 0, LIMB_POWER[limb]);
    this.tasks = this.tasks.filter((t) => t !== task);
    this.stats.hitsByLimb[limb]++;
    const streak = this.scoring.getComboStreak();
    this.stats.bestStreak = Math.max(this.stats.bestStreak, streak);
    const multiplier = this.scoring.getMultiplier();
    if (multiplier !== this.lastMultiplier && COMBO_THRESHOLDS.some((t) => t.count === streak)) {
      this.events.push({ type: 'streak', streak, multiplier });
    }
    this.lastMultiplier = multiplier;
    return { result: 'hit', delta: this.scoring.score - before, limb };
  }

  ability(key: AbilityKey): boolean {
    if (this.phase !== 'playing') return false;
    const now = this.now;
    if (key === 'f') {
      const ok = this.fart(now);
      if (ok) {
        this.stats.farts++;
        this.stats.abilitiesUsed++;
      }
      return ok;
    }
    const ok =
      key === 'q'
        ? this.hands.tossBaby(now)
        : key === 'e'
          ? this.hands.sendToKindergarten(now)
          : this.hands.hideInBathroom(now);
    if (!ok) return false;
    this.stats.abilitiesUsed++;

    const duration = key === 'q' ? DURATIONS.tossBaby : key === 'e' ? DURATIONS.kindergarten : DURATIONS.bathroom;
    this.abilityEnds[key] = now + duration;
    const v = this.meters.values;
    if (key === 'q') v.baby = Math.min(100, v.baby + 24);
    if (key === 'e') v.daughter = Math.min(100, v.daughter + 24);
    if (key === 'r') {
      v.energy = Math.min(100, v.energy + 24);
      v.chaos = Math.max(0, v.chaos - 1.5);
    }

    const clearedType: TaskType | null = key === 'q' ? 'baby' : key === 'e' ? 'daughter' : null;
    for (const task of [...this.tasks]) {
      if (clearedType === null || task.definition.type === clearedType) {
        task.hp = 1;
        this.attack(task.id);
      }
    }
    return true;
  }

  /** Все заботы сдувает, старшая разбегается, в доме чуть больше хаоса. */
  private fart(now: number): boolean {
    if (now < this.fartCooldownEnd || this.hands.state.inBathroom) return false;
    this.abilityEnds.f = now + FART.duration;
    this.fartCooldownEnd = now + FART.cooldown;
    this.meters.values.chaos = Math.min(10, this.meters.values.chaos + FART.chaos);
    for (const task of [...this.tasks]) {
      task.hp = 1;
      this.attack(task.id);
    }
    return true;
  }

  private updateWaves(): void {
    for (let i = 0; i < WAVES.length; i++) {
      const wave = WAVES[i];
      if (this.firedWaves.has(i) || this.elapsed < wave.atSec) continue;
      this.firedWaves.add(i);
      this.pendingWave = { type: wave.type, count: wave.count };
      this.events.push({ type: 'wave', label: wave.label });
    }
  }

  private updateSpawning(dt: number): void {
    this.nextSpawn -= dt;
    if (this.nextSpawn > 0) return;
    // Минутка тишины: новые заботы не прилетают, пока Паша в ванной.
    if (this.hands.state.inBathroom) {
      this.nextSpawn = 0.3;
      return;
    }
    this.spawn();
    this.nextSpawn = this.pendingWave ? 0.55 : Math.max(0.95, 2.1 - this.elapsed * 0.006);
  }

  private spawn(): void {
    let pool = TASK_DEFINITIONS;
    if (this.pendingWave) {
      pool = TASK_DEFINITIONS.filter((d) => d.type === this.pendingWave!.type);
      if (--this.pendingWave.count <= 0) this.pendingWave = null;
    }
    const definition = pool[Math.floor(this.random() * pool.length)];
    const free = Array.from({ length: LANE_COUNT }, (_, l) => l).filter(
      (lane) => !this.tasks.some((t) => t.lane === lane && t.age / t.duration < 0.5),
    );
    const lane = free.length
      ? free[Math.floor(this.random() * free.length)]
      : Math.floor(this.random() * LANE_COUNT);
    const duration = Math.max(4.8, 9 - this.elapsed * 0.017) / (definition.speedMod ?? 1);
    const task: FlyingTask = { id: this.nextId++, definition, age: 0, duration, lane, hp: definition.hp ?? 1 };
    this.tasks.push(task);
    this.events.push({ type: 'spawn', task });
  }

  private updateFlight(dt: number): void {
    for (const task of [...this.tasks]) {
      task.age += dt;
      if (task.age < task.duration) continue;
      const { definition } = task;
      this.meters.onTaskMissed(definition.type, definition.meterDamage, definition.chaosOnMiss);
      this.scoring.onMiss();
      this.lastMultiplier = 1;
      this.sinceMiss = 0;
      this.tasks = this.tasks.filter((t) => t !== task);
      this.events.push({ type: 'miss', task });
    }
  }

  private checkEnding(): void {
    const failure = this.meters.getCriticalFailure();
    if (failure || this.meters.values.chaos >= 10) {
      this.reason = failure ? FAILURE_TEXT[failure] : CHAOS_TEXT;
      this.finish(false);
    } else if (this.elapsed >= RUN_DURATION_SEC) {
      this.finish(true);
    }
  }

  private finish(won: boolean): void {
    this.phase = won ? 'won' : 'lost';
    this.tasks = [];
    this.scoring.finalize(Math.floor(this.elapsed), this.meters.getBalanceBonus(), won);
    this.events.push({ type: 'finish', won });
  }
}
