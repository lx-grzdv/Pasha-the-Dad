import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApartmentGame, FART, MAX_STEP, type FlyingTask } from '../game';
import { RUN_DURATION_SEC, DURATIONS, COOLDOWNS } from '../../config/gameConfig';

/** Детерминированный генератор для повторяемых забегов. */
function seeded(seed: number): () => number {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function makeGame(seed = 42): ApartmentGame {
  const game = new ApartmentGame();
  game.random = seeded(seed);
  game.start();
  return game;
}

function runFor(game: ApartmentGame, seconds: number, step = 1 / 60, each?: () => void): void {
  for (let t = 0; t < seconds; t += step) {
    game.update(step);
    each?.();
  }
}

function firstTask(game: ApartmentGame): FlyingTask {
  runFor(game, 3);
  assert.ok(game.tasks.length > 0, 'за 3 секунды должна прилететь хотя бы одна забота');
  return game.tasks[0];
}

test('старт сбрасывает состояние и открывает забег', () => {
  const game = makeGame();
  assert.equal(game.phase, 'playing');
  assert.equal(game.elapsed, 0);
  assert.deepEqual(game.tasks, []);
  assert.equal(game.scoring.score, 0);
  assert.equal(game.meters.values.baby, 80);
});

test('попадание убирает заботу и начисляет фактическую разницу счёта', () => {
  const game = makeGame();
  const task = firstTask(game);
  task.hp = 1;
  const before = game.scoring.score;
  const result = game.attack(task.id);
  assert.equal(result.result, 'hit');
  assert.equal(result.delta, game.scoring.score - before);
  assert.ok(result.delta > 0);
  assert.ok(!game.tasks.some((t) => t.id === task.id));
  assert.equal(game.scoring.tasksDeflected, 1);
});

test('двухударная забота требует двух попаданий', () => {
  const game = makeGame();
  const task = firstTask(game);
  task.hp = 2;
  assert.equal(game.attack(task.id).result, 'partial');
  assert.ok(game.tasks.some((t) => t.id === task.id));
  assert.equal(game.attack(task.id).result, 'hit');
  assert.ok(!game.tasks.some((t) => t.id === task.id));
});

test('удар по несуществующей заботе ничего не меняет', () => {
  const game = makeGame();
  const result = game.attack(9999);
  assert.equal(result.result, 'none');
  assert.equal(result.delta, 0);
});

test('пропуск снижает шкалу, добавляет хаос и событие miss', () => {
  const game = makeGame();
  const task = firstTask(game);
  const meterBefore = { ...game.meters.values };
  game.events.length = 0;
  runFor(game, task.duration + 0.1);
  assert.ok(!game.tasks.some((t) => t.id === task.id));
  assert.ok(game.events.some((e) => e.type === 'miss' && e.task.id === task.id));
  assert.equal(game.scoring.tasksMissed >= 1, true);
  assert.ok(game.meters.values.chaos > meterBefore.chaos);
});

test('пауза замораживает время, заботы и способности', () => {
  const game = makeGame();
  runFor(game, 2);
  game.pause();
  const snapshot = { elapsed: game.elapsed, ages: game.tasks.map((t) => t.age) };
  runFor(game, 5);
  assert.equal(game.phase, 'paused');
  assert.equal(game.elapsed, snapshot.elapsed);
  assert.deepEqual(game.tasks.map((t) => t.age), snapshot.ages);
  assert.equal(game.ability('q'), false);
  assert.equal(game.attack(game.tasks[0]?.id ?? 1).result, 'none');
  game.resume();
  runFor(game, 1);
  assert.ok(game.elapsed > snapshot.elapsed);
});

test('кулдауны: способность недоступна до конца перезарядки', () => {
  const game = makeGame();
  runFor(game, 1);
  assert.equal(game.ability('q'), true);
  assert.equal(game.hands.state.tossBabyActive, true);
  assert.equal(game.ability('q'), false);
  runFor(game, DURATIONS.tossBaby / 1000 + 0.2);
  assert.equal(game.hands.state.tossBabyActive, false);
  assert.equal(game.ability('q'), false, 'ещё идёт перезарядка');
  runFor(game, (COOLDOWNS.tossBaby - DURATIONS.tossBaby) / 1000 + 0.2);
  assert.equal(game.ability('q'), true);
});

test('выбор конечности зависит от рук и направления', () => {
  const game = makeGame();
  runFor(game, 1);
  assert.equal(game.limbFor(1), 'jump');
  assert.equal(game.limbFor(4), 'foot');
  assert.equal(game.limbFor(0), 'head');
  game.ability('q');
  assert.equal(game.limbFor(1), 'leftHand');
  game.ability('e');
  assert.equal(game.limbFor(4), 'bothHands');
});

test('минутка тишины убирает заботы и останавливает новые', () => {
  const game = makeGame();
  firstTask(game);
  assert.equal(game.ability('r'), true);
  assert.equal(game.tasks.length, 0);
  runFor(game, DURATIONS.bathroom / 1000 - 0.3);
  assert.equal(game.tasks.length, 0, 'пока Паша в ванной, заботы не прилетают');
  runFor(game, 4);
  assert.ok(game.tasks.length > 0, 'после выхода заботы возвращаются');
});

test('без ударов забег проигрывается и приходит событие finish', () => {
  const game = makeGame();
  runFor(game, RUN_DURATION_SEC + 5);
  assert.equal(game.phase, 'lost');
  assert.ok(game.reason.length > 0);
  assert.ok(game.events.some((e) => e.type === 'finish' && e.won === false));
  assert.deepEqual(game.tasks, []);
});

test('при идеальных ударах победа достижима, время забега ровно 180 секунд', () => {
  const game = makeGame(7);
  let steps = 0;
  runFor(game, RUN_DURATION_SEC + 1, 1 / 60, () => {
    steps++;
    for (const task of [...game.tasks]) {
      if (task.age / task.duration > 0.5) {
        task.hp = 1;
        game.attack(task.id);
      }
    }
  });
  assert.equal(game.phase, 'won');
  assert.ok(game.scoring.score > 500);
  assert.ok(game.elapsed >= RUN_DURATION_SEC && game.elapsed < RUN_DURATION_SEC + 0.05);
  assert.ok(steps > RUN_DURATION_SEC * 60);
});

test('волны из конфигурации срабатывают по времени', () => {
  const game = makeGame();
  runFor(game, 50, 1 / 60, () => {
    for (const task of [...game.tasks]) {
      task.hp = 1;
      game.attack(task.id);
    }
  });
  assert.equal(game.phase, 'playing');
  assert.ok(game.events.some((e) => e.type === 'wave'));
});

test('шаг симуляции обрезается до MAX_STEP, отрицательный игнорируется', () => {
  const game = makeGame();
  game.update(5);
  assert.equal(game.elapsed, MAX_STEP);
  game.update(-1);
  assert.equal(game.elapsed, MAX_STEP);
});

test('reset после поражения возвращает чистое стартовое состояние', () => {
  const game = makeGame();
  runFor(game, RUN_DURATION_SEC + 5);
  assert.equal(game.phase, 'lost');
  game.reset();
  assert.equal(game.phase, 'ready');
  assert.equal(game.elapsed, 0);
  assert.deepEqual(game.tasks, []);
  assert.deepEqual(game.events, []);
  assert.equal(game.scoring.score, 0);
  assert.equal(game.reason, '');
  assert.equal(game.hands.state.inBathroom, false);
  game.start();
  runFor(game, 3);
  assert.equal((game.tasks as FlyingTask[])[0]?.id, 1, 'нумерация заданий начинается заново');
});

test('папа пукнул: заботы сдувает, старшая разбегается, правая рука свободна', () => {
  const game = makeGame();
  firstTask(game);
  const chaos = game.meters.values.chaos;
  assert.equal(game.ability('f'), true);
  assert.equal(game.tasks.length, 0);
  assert.equal(game.scattered, true);
  assert.equal(game.limbFor(1), 'rightHand');
  assert.ok(game.meters.values.chaos > chaos);
  assert.equal(game.ability('f'), false, 'перезарядка');
  runFor(game, FART.duration / 1000 + 0.2);
  assert.equal(game.scattered, false);
  assert.equal(game.limbFor(1), 'jump');
  runFor(game, (FART.cooldown - FART.duration) / 1000 + 0.2);
  assert.equal(game.ability('f'), true);
});

test('задача дня детерминирована: одинаковый сид даёт одинаковую раздачу', () => {
  const a = new ApartmentGame();
  const b = new ApartmentGame();
  a.start('daily', 12345);
  b.start('daily', 12345);
  runFor(a, 20);
  runFor(b, 20);
  assert.deepEqual(
    a.events.filter((e) => e.type === 'spawn').map((e) => (e.type === 'spawn' ? [e.task.definition.id, e.task.lane] : null)),
    b.events.filter((e) => e.type === 'spawn').map((e) => (e.type === 'spawn' ? [e.task.definition.id, e.task.lane] : null)),
  );
  assert.equal(a.mode, 'daily');
});

test('серия и чистые 45 секунд дают события и бонус', () => {
  const game = makeGame(3);
  let streakEvent = false;
  let bonusEvent = false;
  runFor(game, 50, 1 / 60, () => {
    for (const task of [...game.tasks]) {
      task.hp = 1;
      game.attack(task.id);
    }
    for (const e of game.events.splice(0)) {
      if (e.type === 'streak') streakEvent = true;
      if (e.type === 'bonus') bonusEvent = true;
    }
  });
  assert.equal(streakEvent, true);
  assert.equal(bonusEvent, true);
  assert.ok(game.stats.cleanBonuses >= 1);
  assert.ok(game.stats.bestStreak >= 10);
  assert.ok(game.history.length >= 49);
});
