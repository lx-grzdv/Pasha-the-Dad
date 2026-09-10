import * as T from 'three';
import { createWorld, FACING } from './world';
import { buildProp } from './props';
import { ApartmentGame, LIMB_LABEL, type AbilityKey, type FlyingTask, type GameEvent, type GameMode, type Limb } from './game';
import { ACHIEVEMENTS, evaluateAchievements, loadUnlocked, nextRank, rankFor, type Achievement } from './achievements';
import { createRunRecord, getLeaderboard, type RunRecord } from '../services/leaderboard';
import { getOrCreatePlayerId, getSavedPlayerName, savePlayerName } from '../services/playerStorage';
import { computeResultStatus } from '../utils/resultStatus';
import { TASK_DEFINITIONS } from '../config/tasks';
import { RUN_DURATION_SEC } from '../config/gameConfig';
import { sfxDeflect, sfxPartialHit, sfxCombo, sfxBonk, sfxGameOver, sfxWin, toggleMute, isMuted } from '../audio/sfx';
import { startMusic, stopMusic, isMusicOn, duckMusic, setMusicMuted } from '../audio/music';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <canvas id="world" aria-label="Трёхмерная квартира Паши"></canvas>
  <div id="ui">
    <div class="vignette"></div>
    <section class="hud">
      <div class="brand"><span class="logo">◎</span> ПАША <span>ПРОТИВ ДНЯ</span><b class="clock" id="clock">03:00</b></div>
      <div id="meters"></div>
    </section>
    <div class="topright">
      <div class="score"><small>ЗАБОТЫ ПОД КОНТРОЛЕМ</small><strong id="score">0</strong><div class="combo" id="combo"></div><div class="pace" id="pace"></div></div>
      <div class="pills">
        <button class="pill" id="pause" aria-label="Пауза">Ⅱ</button>
        <button class="pill" id="help" aria-label="Как играть">?</button>
        <button class="pill" id="sound" aria-label="Выключить звук">♫</button>
        <button class="pill" id="music" aria-label="Выключить музыку">♬</button>
      </div>
    </div>
    <div id="tasks"></div>
    <div class="limb" id="limb"></div>
    <div class="abilities" id="abilities">
      <button class="ability" id="q"><kbd>Q</kbd><span>🍼</span><small>укачать малыша</small></button>
      <button class="ability" id="e"><kbd>E</kbd><span>🧸</span><small>дочка в саду</small></button>
      <button class="ability" id="r"><kbd>R</kbd><span>🚽</span><small>минутка тишины</small></button>
      <button class="ability" id="f"><kbd>F</kbd><span>💨</span><small>папа пукнул</small></button>
    </div>
    <div class="bottom-note">Заботы летят.<br>Ты справишься.</div>
    <a class="switch" href="/">← КЛАССИЧЕСКАЯ 2D</a>
    <div id="overlay"></div>
    <div class="feedback" id="feedback"></div>
    <div class="wave" id="wave"></div>
  </div>`;

const $ = (id: string) => document.getElementById(id)!;

const meterNames = { baby: 'малыш', daughter: 'дочь', work: 'работа', energy: 'энергия', chaos: 'хаос' } as const;
type MeterKey = keyof typeof meterNames;
const meterColors: Record<MeterKey, string> = { baby: '#f27b97', daughter: '#f3d06b', work: '#64c3de', energy: '#acd865', chaos: '#c9c3b0' };
$('meters').innerHTML = (Object.keys(meterNames) as MeterKey[])
  .map(
    (key) =>
      `<div class="meter"><span>${meterNames[key]}</span><div class="bar"><div class="fill" id="fill-${key}" style="--color:${meterColors[key]}"></div></div><b id="value-${key}"></b></div>`,
  )
  .join('');

let renderer: T.WebGLRenderer;
try {
  renderer = new T.WebGLRenderer({ canvas: $('world') as HTMLCanvasElement, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch {
  app.innerHTML =
    '<main class="fatal"><h1>Для этой квартиры нужен WebGL</h1><p>Браузер не смог запустить 3D. Включите аппаратное ускорение или откройте игру в другом браузере.</p><a href="/">Играть в классическую 2D-версию →</a></main>';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const world = createWorld(renderer);
const game = new ApartmentGame();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let w = innerWidth;
let h = innerHeight;

function resize(): void {
  w = innerWidth;
  h = innerHeight;
  renderer.setSize(w, h, false);
  world.resize(w, h);
}
addEventListener('resize', resize);
resize();

const BEST_KEY = 'pasha-apartment-3d-best';
let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  /* Приватный режим может запрещать хранение. */
}

// ---------- Игрок, режим и рекорды ----------

/** Версия для рейтинга: свободный день и задача дня не сравниваются между собой. */
const VERSION_BY_MODE: Record<GameMode, string> = {
  free: 'pasha-apartment-3d@0.4.0',
  daily: 'pasha-apartment-3d-daily@0.4.0',
};
const HISTORY_KEY = 'pasha-apartment-3d-best-history';
const MODE_KEY = 'pasha-apartment-3d-mode';
let runMode: GameMode = 'daily';
let playerName = '';
let bestHistory: number[] = [];
const unlocked = loadUnlocked();
try {
  runMode = localStorage.getItem(MODE_KEY) === 'free' ? 'free' : 'daily';
  playerName = getSavedPlayerName();
  bestHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as number[];
} catch {
  /* Настройки необязательны. */
}

function todayLabel(): string {
  return new Date().toLocaleDateString('ru', { day: 'numeric', month: 'long' });
}

function nameOrGuest(): string {
  return playerName.trim() || 'Папа без имени';
}

function submitRun(): void {
  const v = game.meters.values;
  const base = {
    playerId: getOrCreatePlayerId(),
    playerName: nameOrGuest().slice(0, 24),
    pashaType: 'balancer' as const,
    itemType: 'slipper' as const,
    score: game.scoring.score,
    survivalTime: Math.floor(game.elapsed),
    tasksDeflected: game.scoring.tasksDeflected,
    tasksMissed: game.scoring.tasksMissed,
    maxChaosLevel: Math.round(game.meters.maxChaos * 10),
    babyFinal: Math.round(v.baby),
    daughterFinal: Math.round(v.daughter),
    workFinal: Math.round(v.work),
    energyFinal: Math.round(v.energy),
    won: game.phase === 'won',
  };
  const resultStatus = computeResultStatus({ ...base, itemId: base.itemType });
  const { won, ...partial } = base;
  void won;
  const record: RunRecord = { ...createRunRecord({ ...partial, resultStatus }), gameVersion: VERSION_BY_MODE[game.mode] };
  void getLeaderboard().submitRun(record).then(() => renderBoard(game.mode, record.id));
}

function boardRows(runs: RunRecord[], highlightId?: string): string {
  if (!runs.length) return '<div class="board-empty">Пока пусто. Будь первым.</div>';
  return runs
    .map(
      (r, i) =>
        `<div class="board-row ${r.id === highlightId ? 'me' : ''}"><span>${i + 1}</span><b>${r.playerName.replace(/[<>&]/g, '')}</b><i>${rankFor(r.score)}</i><em>${r.score.toLocaleString('ru')}</em></div>`,
    )
    .join('');
}

/** Заполняет таблицу в текущем оверлее: сегодня для задачи дня, всё время — для свободного. */
function renderBoard(forMode: GameMode, highlightId?: string): void {
  const node = document.getElementById('board');
  if (!node) return;
  const service = getLeaderboard();
  const query = { version: VERSION_BY_MODE[forMode] };
  const request = forMode === 'daily' ? service.getTodayTopRuns(8, query) : service.getTopRuns(8, query);
  request
    .then((runs) => {
      if (document.getElementById('board') !== node) return;
      node.innerHTML = `<div class="board-title">${forMode === 'daily' ? `Задача дня · ${todayLabel()}` : 'Лучшие за всё время'}</div>${boardRows(runs, highlightId)}`;
    })
    .catch(() => {
      node.innerHTML = '<div class="board-empty">Рейтинг недоступен без сети.</div>';
    });
}

function shareText(): string {
  const won = game.phase === 'won';
  return `Паша против дня · ${game.mode === 'daily' ? `задача дня ${todayLabel()}` : 'свободный день'}
${won ? 'День прожит' : 'Завалило'} · ${game.scoring.score.toLocaleString('ru')} очков · ${rankFor(game.scoring.score)}
${game.scoring.tasksDeflected} забот отбито, серия ${game.stats.bestStreak}, попой ×${game.stats.hitsByLimb.butt}
Попробуй побить: ${location.origin}/3d.html`;
}

// ---------- Оверлеи и обратная связь ----------

let overlayMode = '';
let helpOpen = false;
/** Справка открыта во время забега: после закрытия продолжаем игру сами. */
let resumeAfterHelp = false;
let feedbackUntil = 0;
let waveUntil = 0;
/** Итоговое окно показываем с задержкой, чтобы увидеть завал или объятия. */
let finishOverlayAt = 0;
let finishOverlayMode = '';
let freshAchievements: Achievement[] = [];

function feedback(text: string): void {
  $('feedback').textContent = text;
  $('feedback').classList.add('show');
  feedbackUntil = performance.now() + 1700;
}

function showWave(text: string): void {
  $('wave').textContent = text;
  $('wave').classList.add('show');
  waveUntil = performance.now() + 2600;
}

function startRun(): void {
  finishOverlayMode = '';
  if (musicWanted && !isMuted() && !isMusicOn()) startMusic();
  duckMusic(false);
  game.start(runMode);
  freshAchievements = [];
  resetAnimation();
  overlay('');
  sfxCombo();
}

function overlay(mode: string): void {
  overlayMode = mode;
  const node = $('overlay');
  if (mode === '') {
    node.innerHTML = '';
    $('abilities').classList.remove('hidden');
    duckMusic(false);
    return;
  }
  const ready = mode === 'ready';
  const help = mode === 'help';
  const won = mode === 'won';
  const lost = mode === 'lost';
  const bottom = ready || won || lost;
  $('abilities').classList.toggle('hidden', bottom);
  duckMusic(true);

  const eyebrow = won ? 'маленькая большая победа' : lost ? 'завтра получится' : help ? 'как играть' : 'паша против дня';
  const title = ready
    ? 'Ещё один день.<br>Ты — папа.'
    : help
      ? 'Дом держится на тебе.'
      : won
        ? 'День прожит. Обними их.'
        : lost
          ? 'Папа тоже человек.'
          : 'Выдохни. Мы подождём.';
  const text = ready
    ? 'Трое в одной квартире. Сотня маленьких дел. Отбивай заботы и продержись 3 минуты.'
    : help
      ? 'Нажимай на летящие карточки до того, как они доберутся до Паши. Карточкам с «×2» нужны два удара. Пропуски снижают показатели, добавляют хаос и захламляют квартиру.'
      : won
        ? 'Ты сохранил баланс между семьёй, работой и собой. Сегодня этого достаточно.'
        : lost
          ? game.reason
          : 'Время, заботы и способности на паузе.';
  const helpGrid = help
    ? `<div class="help-grid">
        Руки заняты малышом и дочкой, поэтому обычно Паша бьёт <b>головой</b>.<br>
        <b>Q</b> — подбросить малыша: +24 внимания, левая рука свободна на 6 с.<br>
        <b>E</b> — дочка в саду: +24 внимания, правая рука свободна на 18 с.<br>
        Свободные руки бьют сильнее, две руки — сильнее всего.<br>
        <b>R</b> — минутка тишины: +24 энергии, заботы улетают, новые не приходят 6 с.<br>
        <b>F</b> — папа пукнул: все заботы сдувает, старшая разбегается на 5 с, хаос чуть растёт.<br>
        <b>Esc / P</b> — пауза. На телефоне — кнопки снизу.<br>
        Не дай шкалам опустеть, а хаосу — заполниться.
      </div>`
    : '';
  const rank = rankFor(game.scoring.score);
  const next = nextRank(game.scoring.score);
  const result =
    won || lost
      ? `<p class="result"><b>${game.scoring.score.toLocaleString('ru')} очков</b> · ${game.scoring.tasksDeflected} забот · серия ${game.stats.bestStreak} · ${game.scoring.tasksMissed} мимо</p>
         <p class="rank">Звание: <b>${rank}</b>${next ? ` · до «${next.title}» ${next.missing.toLocaleString('ru')}` : ' · выше некуда'}</p>
         ${freshAchievements.length ? `<div class="unlocked">${freshAchievements.map((a) => `<span title="${a.hint}">${a.icon} ${a.title}</span>`).join('')}</div>` : ''}
         <div class="board" id="board">Считаем рейтинг…</div>`
      : '';
  const setup = ready
    ? `<label class="name"><span>Имя для рейтинга</span><input id="name" maxlength="24" placeholder="Папа без имени" value="${playerName.replace(/"/g, '&quot;')}"></label>
       <div class="modes" role="radiogroup" aria-label="Режим дня">
         <button class="mode ${runMode === 'daily' ? 'on' : ''}" data-mode="daily" role="radio" aria-checked="${runMode === 'daily'}">Задача дня<small>${todayLabel()} · у всех одинаково</small></button>
         <button class="mode ${runMode === 'free' ? 'on' : ''}" data-mode="free" role="radio" aria-checked="${runMode === 'free'}">Свободный день<small>случайные заботы</small></button>
       </div>
       <div class="progress">Достижений ${unlocked.size} из ${ACHIEVEMENTS.length} · рекорд ${best.toLocaleString('ru')} · ${rankFor(best)}</div>
       <div class="board" id="board">Считаем рейтинг…</div>`
    : '';
  const action = ready ? 'НАЧАТЬ ДЕНЬ →' : help ? 'ПОНЯТНО' : won || lost ? 'ЕЩЁ ОДИН ДЕНЬ →' : 'ПРОДОЛЖИТЬ →';
  const restart = mode === 'paused' ? '<button class="secondary" id="restart">Начать заново</button>' : '';
  const ariaLabel = help ? 'Как играть' : ready ? 'Начать игру' : won || lost ? 'Итог дня' : 'Игра приостановлена';

  node.innerHTML = `
    <section class="splash ${bottom ? 'bottom' : ''}" role="dialog" aria-modal="${!ready}" aria-label="${ariaLabel}">
      <div class="splash-text">
        <div class="eyebrow">${eyebrow}</div>
        <h1>${title}</h1>
        <p>${text}</p>
        ${helpGrid}${result}
      </div>
      <div class="splash-actions">
        ${setup}
        <button class="primary" id="mainAction" autofocus>${action}</button>
        ${won || lost ? '<button class="secondary" id="share">Скопировать результат</button>' : ''}
        ${restart}
        ${ready ? '' : `<div class="record">Личный рекорд 3D: ${best.toLocaleString('ru')} · сохраняется на устройстве</div>`}
      </div>
    </section>`;

  const main = $('mainAction') as HTMLButtonElement;
  main.onclick = () => {
    if (help) {
      helpOpen = false;
      if (resumeAfterHelp) {
        resumeAfterHelp = false;
        game.resume();
        overlay('');
      } else {
        overlay(game.phase === 'playing' ? '' : game.phase);
      }
    } else if (ready || won || lost) {
      startRun();
    } else {
      game.resume();
      overlay('');
    }
  };
  if (ready) {
    const input = $('name') as HTMLInputElement;
    input.oninput = () => {
      playerName = input.value;
      try {
        savePlayerName(playerName);
      } catch {
        /* Хранилище необязательно. */
      }
    };
    node.querySelectorAll<HTMLButtonElement>('.mode').forEach((button) => {
      button.onclick = () => {
        runMode = button.dataset.mode === 'free' ? 'free' : 'daily';
        try {
          localStorage.setItem(MODE_KEY, runMode);
        } catch {
          /* Хранилище необязательно. */
        }
        overlay('ready');
      };
    });
    renderBoard(runMode);
  }
  if (won || lost) {
    $('share').onclick = () => {
      navigator.clipboard?.writeText(shareText()).then(
        () => feedback('Результат скопирован. Кидай в чат!'),
        () => feedback('Не удалось скопировать.'),
      );
    };
  }
  if (!ready) main.focus({ preventScroll: true });
  node.querySelector('.primary')?.addEventListener('pointerdown', () => {
    if (musicWanted && !isMuted() && !isMusicOn()) startMusic();
  });
  if (mode === 'paused') $('restart').onclick = startRun;
}

function togglePause(): void {
  if (helpOpen) return;
  if (game.phase === 'playing') {
    game.pause();
    overlay('paused');
  } else if (game.phase === 'paused') {
    game.resume();
    overlay('');
  }
}

$('pause').onclick = togglePause;
$('help').onclick = () => {
  if (helpOpen) return;
  if (game.phase === 'playing') {
    game.pause();
    resumeAfterHelp = true;
  }
  helpOpen = true;
  overlay('help');
};
$('sound').onclick = () => {
  const muted = toggleMute();
  $('sound').textContent = muted ? '♪̸' : '♫';
  $('sound').setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
  setMusicMuted(muted);
};
let musicWanted = true;
try {
  musicWanted = localStorage.getItem('pasha-apartment-3d-music') !== 'off';
} catch {
  /* Настройка необязательна. */
}
function syncMusicButton(): void {
  $('music').classList.toggle('off', !musicWanted);
  $('music').setAttribute('aria-label', musicWanted ? 'Выключить музыку' : 'Включить музыку');
}
$('music').onclick = () => {
  musicWanted = !musicWanted;
  try {
    localStorage.setItem('pasha-apartment-3d-music', musicWanted ? 'on' : 'off');
  } catch {
    /* Настройка необязательна. */
  }
  if (musicWanted && !isMuted()) startMusic();
  else stopMusic();
  syncMusicButton();
};
syncMusicButton();

function ability(key: AbilityKey): void {
  if (!game.ability(key)) return;
  sfxCombo();
  if (key === 'f') fartCloud();
  const texts = {
    q: 'Малыш летит и хохочет. Левая рука свободна!',
    e: 'Дочка ушла в сад. Правая рука свободна!',
    r: 'Тишина. Всего на минутку.',
    f: 'Пф-ф-ф! Старшая с визгом разбежалась.',
  };
  feedback(texts[key]);
}
for (const key of ['q', 'e', 'r', 'f'] as const) $(key).onclick = () => ability(key);

addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
  const pauseKey = event.code === 'Escape' || event.code === 'KeyP' || event.key === 'Escape' || ['p', 'з'].includes(event.key.toLowerCase());
  if (pauseKey) {
    event.preventDefault();
    if (overlayMode === 'help') {
      ($('mainAction') as HTMLButtonElement).click();
      return;
    }
    togglePause();
  }
  const byCode = ({ KeyQ: 'q', KeyE: 'e', KeyR: 'r', KeyF: 'f' } as Record<string, AbilityKey>)[event.code];
  const byKey = ({ q: 'q', e: 'e', r: 'r', f: 'f', й: 'q', у: 'e', к: 'r', а: 'f' } as Record<string, AbilityKey>)[event.key.toLowerCase()];
  const key = byCode ?? byKey;
  if (key) {
    event.preventDefault();
    ability(key);
  }
  if ((event.code === 'Space' || event.code === 'Enter') && overlayMode && document.activeElement?.tagName !== 'BUTTON') {
    event.preventDefault();
    ($('mainAction') as HTMLButtonElement).click();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') {
    game.pause();
    overlay('paused');
  }
});

$('world').addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  game.pause();
  overlay('paused');
  feedback('Графика прервана. Перезагрузите страницу или откройте 2D.');
});

// ---------- Карточки задач ----------

/** Откуда прилетают заботы: периферия комнаты, чтобы карточки не закрывали семью. */
const lanePoints = [
  new T.Vector3(-4.6, 2.6, -0.2),
  new T.Vector3(-2.4, 3.6, -3.9),
  new T.Vector3(1.6, 3.7, -3.9),
  new T.Vector3(4.9, 2.9, -2.4),
  new T.Vector3(5.4, 1.9, 1.6),
  new T.Vector3(-3.9, 1.7, 3.9),
];
const laneAngles = lanePoints.map((p) => Math.atan2(p.x - world.family.position.x, p.z - world.family.position.z));
const headWorld = new T.Vector3();
const projected = new T.Vector3();

function project(v: T.Vector3): { x: number; y: number } {
  projected.copy(v).project(world.camera);
  return { x: (projected.x * 0.5 + 0.5) * w, y: (-0.5 * projected.y + 0.5) * h };
}

function headTarget(): T.Vector3 {
  return world.dad.group.localToWorld(headWorld.set(0, world.dad.headY, 0));
}

const taskNodes = new Map<number, HTMLButtonElement>();
const previewDefs = [
  TASK_DEFINITIONS[0],
  TASK_DEFINITIONS[10],
  { ...TASK_DEFINITIONS[20], label: 'полить цветы', icon: '🪴' },
  { ...TASK_DEFINITIONS[21], label: 'стирка ждёт', icon: '👕' },
  { ...TASK_DEFINITIONS[20], label: 'туалет готов!', icon: '🚽' },
  { ...TASK_DEFINITIONS[20], label: 'готовить ужин', icon: '🍲' },
];
const previewTasks: FlyingTask[] = previewDefs.map((definition, lane) => ({ id: -lane - 1, definition, lane, hp: definition.hp ?? 1, age: 0, duration: 10 }));

const cardColors = { baby: '#ffb3c4', daughter: '#ffe39a', work: '#a7dcff', chaos: '#d9f1a6' } as const;

function cardColor(task: FlyingTask): string {
  if (task.definition.type === 'chaos' && task.lane % 2) return '#ffe39a';
  return cardColors[task.definition.type];
}

// ---------- Летящие заботы: настоящие предметы с подписью ----------

const LABEL_W = 1.9;
const LABEL_H = 0.5;
const labelTextures = new Map<string, T.CanvasTexture>();

/** Подпись-плашка под предметом: цвет типа заботы, белая кромка, жирный текст. */
function labelTexture(task: FlyingTask): T.CanvasTexture {
  const color = cardColor(task);
  const key = `${task.definition.label}|${color}`;
  let tx = labelTextures.get(key);
  if (tx) return tx;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 136;
  const cx = c.getContext('2d')!;
  cx.fillStyle = '#fffdf5';
  cx.beginPath();
  cx.roundRect(0, 0, 512, 136, 60);
  cx.fill();
  cx.fillStyle = color;
  cx.beginPath();
  cx.roundRect(10, 10, 492, 116, 52);
  cx.fill();
  cx.fillStyle = '#3c2e22';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  let size = 60;
  cx.font = `900 ${size}px ui-rounded, "SF Pro Rounded", "Trebuchet MS", Arial, sans-serif`;
  while (cx.measureText(task.definition.label).width > 450 && size > 34) {
    size -= 4;
    cx.font = `900 ${size}px ui-rounded, "SF Pro Rounded", "Trebuchet MS", Arial, sans-serif`;
  }
  cx.fillText(task.definition.label, 256, 72);
  tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  tx.anisotropy = renderer.capabilities.getMaxAnisotropy();
  labelTextures.set(key, tx);
  return tx;
}

interface CardMesh {
  group: T.Group;
  prop: T.Group;
  billboard: T.Group;
  label: T.Mesh;
  life: T.Mesh;
  hp: T.Mesh;
  trail: T.Group;
  /** Секунд с момента удара: предмет улетает и тает. */
  gone: number;
  lane: number;
  seed: number;
}

const cardMeshes = new Map<number, CardMesh>();
const goneCards: CardMesh[] = [];
const lifeMat = new T.MeshBasicMaterial({ color: '#5a4636', toneMapped: false });
const lifeBackMat = new T.MeshBasicMaterial({ color: '#fffdf5', toneMapped: false });
const trailMat = new T.MeshBasicMaterial({ color: '#fff8d6', transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
const hpTexture = (() => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const cx = c.getContext('2d')!;
  cx.fillStyle = '#fffdf5';
  cx.beginPath();
  cx.arc(64, 64, 60, 0, Math.PI * 2);
  cx.fill();
  cx.fillStyle = '#3c2e22';
  cx.font = '900 62px ui-rounded, Arial, sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText('×2', 64, 68);
  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  return tx;
})();

function createCardMesh(task: FlyingTask): CardMesh {
  const group = new T.Group();
  const prop = buildProp(task.definition.id);
  prop.position.y = 0.5;
  prop.scale.setScalar(1.45);
  group.add(prop);
  const billboard = new T.Group();
  group.add(billboard);
  const label = new T.Mesh(
    new T.PlaneGeometry(LABEL_W, LABEL_H),
    new T.MeshBasicMaterial({ map: labelTexture(task), transparent: true, toneMapped: false }),
  );
  label.position.y = -0.55;
  billboard.add(label);
  const lifeBack = new T.Mesh(new T.PlaneGeometry(LABEL_W * 0.7, 0.08), lifeBackMat);
  lifeBack.position.set(0, -0.92, 0);
  billboard.add(lifeBack);
  const life = new T.Mesh(new T.PlaneGeometry(LABEL_W * 0.7, 0.08), lifeMat);
  life.position.set(0, -0.92, 0.01);
  billboard.add(life);
  const hp = new T.Mesh(new T.PlaneGeometry(0.4, 0.4), new T.MeshBasicMaterial({ map: hpTexture, transparent: true, toneMapped: false }));
  hp.position.set(0.75, 0.85, 0);
  billboard.add(hp);
  const trail = new T.Group();
  for (let i = 0; i < 3; i++) {
    const len = 1.1 + i * 0.45;
    const streak = new T.Mesh(new T.BoxGeometry(0.05, 0.05, len), trailMat);
    streak.position.set((i - 1) * 0.28, (i % 2) * 0.2 - 0.1, len / 2 + 0.5);
    trail.add(streak);
  }
  world.scene.add(trail);
  world.scene.add(group);
  return { group, prop, billboard, label, life, hp, trail, gone: -1, lane: task.lane, seed: task.id * 1.7 };
}

function disposeCardMesh(card: CardMesh): void {
  world.scene.remove(card.group);
  world.scene.remove(card.trail);
  card.group.traverse((o) => (o as T.Mesh).geometry?.dispose?.());
  card.trail.children.forEach((c) => (c as T.Mesh).geometry.dispose());
}

function placeCard(card: CardMesh, position: T.Vector3, time: number, scale: number): void {
  card.group.position.copy(position);
  card.group.scale.setScalar(scale);
  card.billboard.quaternion.copy(world.camera.quaternion);
  card.prop.rotation.y = reducedMotion ? 0.6 : time * 1.4 + card.seed;
  card.prop.rotation.z = reducedMotion ? 0 : Math.sin(time * 2 + card.seed) * 0.12;
  card.trail.position.copy(position);
  card.trail.lookAt(lanePoints[card.lane]);
}

// ---------- Эффект удара: кольцо воздуха и звёздочки ----------

interface Impact {
  group: T.Group;
  ring: T.Mesh;
  stars: T.Mesh[];
  age: number;
}

const impacts: Impact[] = [];
const ringMat = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: T.DoubleSide });
const starMat = new T.MeshBasicMaterial({ color: '#ffd75e', toneMapped: false });

function impact(position: T.Vector3, strong: boolean): void {
  const group = new T.Group();
  group.position.copy(position);
  const ring = new T.Mesh(new T.RingGeometry(0.5, 0.7, 40), ringMat.clone());
  group.add(ring);
  const stars: T.Mesh[] = [];
  for (let i = 0; i < (strong ? 8 : 5); i++) {
    const s = new T.Mesh(new T.OctahedronGeometry(0.11), starMat);
    s.userData.dir = new T.Vector3(Math.cos(i * 1.3), Math.sin(i * 1.3) * 0.8 + 0.3, Math.sin(i * 0.7)).normalize();
    group.add(s);
    stars.push(s);
  }
  world.scene.add(group);
  impacts.push({ group, ring, stars, age: 0 });
}

function animateImpacts(dt: number): void {
  for (const fx of [...impacts]) {
    fx.age += dt;
    const k = fx.age / 0.42;
    if (k >= 1) {
      impacts.splice(impacts.indexOf(fx), 1);
      world.scene.remove(fx.group);
      fx.ring.geometry.dispose();
      (fx.ring.material as T.Material).dispose();
      fx.stars.forEach((s) => s.geometry.dispose());
      continue;
    }
    fx.ring.quaternion.copy(world.camera.quaternion);
    fx.ring.scale.setScalar(0.4 + k * 2.6);
    (fx.ring.material as T.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    for (const s of fx.stars) {
      s.position.copy(s.userData.dir as T.Vector3).multiplyScalar(k * 2.2);
      s.position.y -= k * k * 1.2;
      s.rotation.x += dt * 10;
      s.rotation.y += dt * 8;
      s.scale.setScalar(1 - k);
    }
  }
}

function spawnFloat(text: string, x: number, y: number, small = false): void {
  const float = document.createElement('span');
  float.className = `floating ${small ? 'small' : ''}`;
  float.textContent = text;
  float.style.left = `${x}px`;
  float.style.top = `${y}px`;
  $('ui').append(float);
  setTimeout(() => float.remove(), 900);
}

function hitTask(task: FlyingTask, node: HTMLButtonElement): void {
  if (game.phase !== 'playing') return;
  const { result, delta, limb } = game.attack(task.id);
  if (result === 'none') return;
  startAttack(limb, task.lane);
  const x = parseFloat(node.style.left);
  const y = parseFloat(node.style.top);
  const card = cardMeshes.get(task.id);
  if (card) impact(card.group.position, result === 'hit');
  if (result === 'partial') {
    sfxPartialHit();
    spawnFloat('ещё удар!', x, y - 30, true);
    if (card) card.group.position.y += 0.3;
  } else {
    sfxDeflect();
    spawnFloat(`+${delta}`, x, y - 20);
    if (card) {
      cardMeshes.delete(task.id);
      card.gone = 0;
      card.trail.visible = false;
      goneCards.push(card);
    }
  }
}

function createTaskNode(task: FlyingTask): HTMLButtonElement {
  const node = document.createElement('button');
  node.className = 'task';
  node.setAttribute('aria-label', `${task.definition.label}: отбить заботу`);
  node.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    hitTask(task, node);
  };
  node.onkeydown = (event) => {
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      hitTask(task, node);
    }
  };
  $('tasks').append(node);
  return node;
}

function animateGoneCards(dt: number): void {
  for (const card of [...goneCards]) {
    card.gone += dt;
    const k = card.gone / 0.45;
    if (k >= 1) {
      goneCards.splice(goneCards.indexOf(card), 1);
      disposeCardMesh(card);
      continue;
    }
    card.group.position.y += dt * 10;
    card.group.position.x += dt * (card.lane < 3 ? -7 : 7);
    card.prop.rotation.x += dt * 14;
    card.prop.rotation.z += dt * 9;
    card.billboard.visible = false;
    card.group.scale.setScalar(1 - k * 0.5);
  }
}

function drawTasks(time: number): void {
  const list = game.phase === 'ready' ? previewTasks : game.tasks;
  const ids = new Set(list.map((t) => t.id));
  for (const [id, node] of taskNodes) {
    if (ids.has(id)) continue;
    node.remove();
    taskNodes.delete(id);
    const card = cardMeshes.get(id);
    if (card) {
      cardMeshes.delete(id);
      disposeCardMesh(card);
    }
  }
  const goal = headTarget();
  const target = project(goal);
  const playing = game.phase === 'playing';

  for (const task of list) {
    let node = taskNodes.get(task.id);
    if (!node) {
      node = createTaskNode(task);
      taskNodes.set(task.id, node);
    }
    let card = cardMeshes.get(task.id);
    if (!card) {
      card = createCardMesh(task);
      cardMeshes.set(task.id, card);
    }
    const progress = task.age / task.duration;
    const zig = task.definition.movement === 'zigzag' && !reducedMotion ? Math.sin(progress * 14 + task.id) * 0.45 : 0;
    const v = lanePoints[task.lane].clone().lerp(goal, progress * 0.8);
    v.y += zig + (reducedMotion ? 0 : Math.sin(time * 2.2 + task.id) * 0.06);
    placeCard(card, v, time, 1 - progress * 0.1);
    card.life.scale.x = Math.max(0.001, 1 - progress);
    card.life.position.x = (-(LABEL_W * 0.7) / 2) * progress;
    card.hp.visible = task.hp > 1;
    const urgent = progress > 0.72 && playing;
    (card.label.material as T.MeshBasicMaterial).color.setScalar(urgent && !reducedMotion ? 0.8 + Math.sin(time * 18) * 0.2 : 1);
    card.trail.visible = true;

    // Невидимая DOM-кнопка над предметом: клики, клавиатура и скринридер.
    const p = project(v);
    const px = (2.0 * h) / (world.camera.top - world.camera.bottom);
    node.style.left = `${p.x}px`;
    node.style.top = `${p.y}px`;
    node.style.width = `${px}px`;
    node.style.height = `${px}px`;
    node.style.transform = 'translate(-50%,-50%)';
    node.disabled = !playing;
    void target;
  }
}

// ---------- HUD ----------

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

const abilityCaptions = { q: 'укачать малыша', e: 'дочка в саду', r: 'минутка тишины', f: 'папа пукнул' } as const;

function hud(): void {
  for (const key of Object.keys(meterNames) as MeterKey[]) {
    const value = game.meters.values[key] * (key === 'chaos' ? 10 : 1);
    $(`fill-${key}`).style.width = `${value}%`;
    $(`value-${key}`).textContent = `${Math.round(value)}%`;
    $(`fill-${key}`).parentElement!.classList.toggle('low', key !== 'chaos' ? value < 25 : value > 75);
  }
  $('clock').textContent = formatClock(game.phase === 'ready' ? RUN_DURATION_SEC : game.timeLeft);
  $('score').textContent = game.scoring.score.toLocaleString('ru');
  const streak = game.scoring.getComboStreak();
  $('combo').textContent = streak > 1 ? `${streak} подряд · ×${game.scoring.getMultiplier()}` : '';
  const second = Math.floor(game.elapsed);
  const pace = $('pace');
  if (game.phase === 'playing' && bestHistory.length > second && second > 3) {
    const diff = game.scoring.score - bestHistory[second];
    pace.textContent = `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('ru')} к рекорду`;
    pace.className = `pace ${diff >= 0 ? 'ahead' : 'behind'}`;
  } else {
    pace.textContent = '';
    pace.className = 'pace';
  }
  const hand = game.freeHand();
  $('limb').textContent =
    game.phase !== 'playing' ? '' : hand ? `Паша бьёт ${LIMB_LABEL[hand]}${hand === 'bothHands' ? ' · ×1.3' : ''}` : 'руки заняты: в ход идут нос, ноги и попа';

  const cooldowns = game.cooldowns();
  const state = game.hands.state;
  for (const key of ['q', 'e', 'r', 'f'] as const) {
    const node = $(key) as HTMLButtonElement;
    const active = key === 'q' ? state.tossBabyActive : key === 'e' ? state.kindergartenActive : key === 'r' ? state.inBathroom : game.scattered;
    node.disabled = game.phase !== 'playing' || cooldowns[key] > 0 || (key !== 'r' && state.inBathroom);
    node.classList.toggle('active', active);
    const caption = active
      ? `активно ${Math.max(0, Math.ceil((game.abilityEnds[key] - game.now) / 1000))} с`
      : cooldowns[key] > 0
        ? `через ${Math.ceil(cooldowns[key] / 1000)} с`
        : abilityCaptions[key];
    node.querySelector('small')!.textContent = caption;
  }
  $('pause').textContent = game.phase === 'paused' ? '▶' : 'Ⅱ';
  $('pause').setAttribute('aria-label', game.phase === 'paused' ? 'Продолжить' : 'Пауза');
}

// ---------- Анимация семьи и хаоса ----------

const ATTACK_TIME = 0.4;
const anim = {
  attack: 0,
  limb: 'head' as Limb,
  turn: 0,
  turnTarget: 0,
  flinch: 0,
  bath: 0,
  away: 0,
  clutterShown: 0,
  avalanche: -1,
};
const familyHome = world.family.position.clone();
const daughterHome = world.daughter.group.position.clone();

function resetAnimation(): void {
  anim.attack = 0;
  anim.flinch = 0;
  anim.turn = 0;
  anim.turnTarget = 0;
  anim.clutterShown = 0;
  anim.avalanche = -1;
  for (const item of world.clutter) {
    item.group.visible = false;
    item.drop = 0;
  }
}

function startAttack(limb: Limb, lane: number): void {
  anim.attack = ATTACK_TIME;
  anim.limb = limb;
  const toward = Math.max(-0.8, Math.min(0.8, laneAngles[lane] - FACING)) * 0.7;
  // Попой бьют спиной к карточке.
  anim.turnTarget = limb === 'butt' ? toward + Math.PI : toward;
}

function revealClutter(pile = false): void {
  const item = world.clutter[anim.clutterShown];
  if (!item) return;
  anim.clutterShown++;
  const spot = pile ? item.pile : item.home;
  item.group.position.set(spot.x, 0, spot.z);
  item.group.visible = true;
  item.drop = 1;
}

function animateClutter(dt: number): void {
  if (anim.avalanche >= 0) {
    anim.avalanche += dt;
    const shouldShow = Math.min(world.clutter.length, Math.floor(anim.avalanche / 0.03));
    // При поражении всё, что уже лежало, тоже сползает к Паше: он тонет в завале.
    if (anim.avalanche < dt * 1.5) {
      for (let i = 0; i < anim.clutterShown; i++) {
        const item = world.clutter[i];
        item.group.position.set(item.pile.x, 0, item.pile.z);
        item.drop = 1;
      }
    }
    while (anim.clutterShown < shouldShow) revealClutter(true);
  }
  const buried = anim.avalanche >= 0;
  for (const item of world.clutter) {
    if (!item.group.visible) continue;
    if (item.drop > 0) item.drop = Math.max(0, item.drop - dt * 2.2);
    const bounce = Math.abs(Math.sin((1 - item.drop) * Math.PI * 1.5)) * item.drop;
    const restY = buried ? item.pile.y : item.restY;
    item.group.position.y = restY + item.drop * item.drop * 2.6 + bounce * 0.3;
    item.group.rotation.z = item.drop * item.spin * 2;
  }
}

function handleEvent(event: GameEvent): void {
  if (event.type === 'miss') {
    sfxBonk();
    feedback(`Пропущено: ${event.task.definition.label}. Держи баланс!`);
    anim.flinch = 0.45;
    revealClutter();
  } else if (event.type === 'wave') {
    showWave(event.label);
  } else if (event.type === 'streak') {
    sfxCombo();
    showWave(`СЕРИЯ ${event.streak} · ×${event.multiplier}`);
  } else if (event.type === 'bonus') {
    sfxCombo();
    showWave(`${event.label} +${event.points}`);
  } else if (event.type === 'finish') {
    freshAchievements = evaluateAchievements(game, unlocked);
    if (game.scoring.score > best) {
      best = game.scoring.score;
      bestHistory = [...game.history];
      try {
        localStorage.setItem(BEST_KEY, String(best));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(bestHistory));
      } catch {
        /* Хранилище необязательно. */
      }
    }
    submitRun();
    if (!event.won) anim.avalanche = 0;
    if (event.won) sfxWin();
    else sfxGameOver();
    finishOverlayMode = event.won ? 'won' : 'lost';
    finishOverlayAt = performance.now() + (event.won ? 900 : 2600);
  }
}

function animateFamily(dt: number, now: number): void {
  const { dad, daughter } = world;
  const t = game.phase === 'ready' ? now / 1000 : game.elapsed;
  const state = game.hands.state;
  const playing = game.phase === 'playing';

  // Дыхание и лёгкое покачивание.
  dad.group.position.y = dad.baseY;
  daughter.group.position.y = 0;
  if (!reducedMotion) {
    dad.group.position.y += Math.sin(t * 2) * 0.02;
    dad.torso.rotation.z = Math.sin(t * 1.3) * 0.02;
    daughter.group.rotation.z = Math.sin(t * 2.5) * 0.04;
    daughter.group.position.y = Math.abs(Math.sin(t * 2.5)) * 0.03;
  }

  // Удар выбранной конечностью.
  let lean = 0;
  let headNod = 0;
  let leftSwing = 0;
  let rightSwing = 0;
  let jump = 0;
  let kick = 0;
  let lurch = 0;
  if (anim.attack > 0) {
    anim.attack = Math.max(0, anim.attack - dt);
    const s = Math.sin((1 - anim.attack / ATTACK_TIME) * Math.PI);
    switch (anim.limb) {
      case 'head':
        lean = s * 0.5;
        headNod = s * 0.45;
        break;
      case 'jump':
        jump = s * 1.1;
        lean = s * 0.35;
        headNod = s * 0.5;
        kick = -s * 0.6;
        break;
      case 'foot':
        kick = s * 1.7;
        lean = -s * 0.3;
        break;
      case 'butt':
        lean = s * 0.85;
        lurch = s * 0.45;
        break;
      case 'bothHands':
        lean = s * 0.25;
        leftSwing = rightSwing = s * 2.0;
        break;
      case 'leftHand':
        leftSwing = s * 2.1;
        lean = s * 0.12;
        break;
      default:
        rightSwing = s * 2.1;
        lean = s * 0.12;
    }
  } else {
    anim.turnTarget = 0;
  }
  anim.turn += (anim.turnTarget - anim.turn) * Math.min(1, dt * 14);

  // Отшатнуться после пропущенной заботы.
  if (anim.flinch > 0) {
    anim.flinch = Math.max(0, anim.flinch - dt);
    const f = anim.flinch / 0.45;
    lean -= f * 0.35;
    dad.head.rotation.z = Math.sin(now / 35) * f * 0.12;
  } else {
    dad.head.rotation.z = 0;
  }

  // Тонет в завале при поражении.
  const sink = anim.avalanche >= 0 ? Math.min(1.15, anim.avalanche * 0.5) : 0;
  dad.group.rotation.y = anim.turn;
  dad.group.position.y += jump - sink;
  dad.group.position.z = lurch;
  dad.torso.rotation.x = lean + (reducedMotion ? 0 : Math.sin(t * 2) * 0.01) - sink * 0.3;
  dad.head.rotation.x = headNod;
  dad.leftArm.rotation.x = -leftSwing - sink * 1.4;
  dad.rightArm.rotation.x = -rightSwing - sink * 1.4;
  dad.rightArm.rotation.z = rightSwing * 0.3;
  const kickLeg = anim.limb === 'foot' && anim.turnTarget < 0 ? dad.legs[0] : dad.legs[1];
  const otherLeg = kickLeg === dad.legs[0] ? dad.legs[1] : dad.legs[0];
  kickLeg.rotation.x = -kick;
  otherLeg.rotation.x = anim.limb === 'jump' ? -kick : kick * 0.15;
  daughter.group.position.y -= sink * 0.6;

  // Q: малыш летает над руками.
  if (state.tossBabyActive) {
    const phase = (game.now - (game.abilityEnds.q - 6000)) / 1000;
    dad.baby.position.y = -0.42 + Math.abs(Math.sin(phase * 3.4)) * 1.1;
    dad.baby.rotation.z = 0.55 + Math.sin(phase * 3.4) * 0.6;
  } else {
    dad.baby.position.y = -0.42;
    dad.baby.rotation.z = 0.55 + (reducedMotion ? 0 : Math.sin(t * 2) * 0.05);
  }

  // R: Паша уходит в ванную, малыш ждёт в кроватке.
  anim.bath = Math.max(0, Math.min(1, anim.bath + (state.inBathroom ? dt * 2.2 : -dt * 2.2)));
  const bathEase = anim.bath * anim.bath * (3 - 2 * anim.bath);
  world.family.position.lerpVectors(familyHome, world.doorPosition, bathEase);
  dad.group.visible = anim.bath < 0.98;
  world.cribBaby.visible = state.inBathroom || anim.bath > 0.5;
  dad.baby.visible = !world.cribBaby.visible;
  world.doorSign.emissiveIntensity = state.inBathroom ? 0.9 : 0;
  if (anim.bath > 0 && anim.bath < 1 && !reducedMotion) dad.group.position.y = Math.abs(Math.sin(now / 90)) * 0.06;

  // E: дочка уходит в сад и возвращается. F: разбегается быстрее и дальше.
  const gone = state.kindergartenActive || game.scattered;
  anim.away = Math.max(0, Math.min(1, anim.away + (gone ? dt * (game.scattered ? 2.2 : 0.9) : -dt * 0.9)));
  daughter.group.position.x = daughterHome.x + anim.away * 7 - bathEase * 1.28;
  daughter.group.position.z = daughterHome.z - anim.away * 1.5;
  daughter.group.visible = anim.away < 1;
  if (anim.away > 0 && anim.away < 1 && !reducedMotion) daughter.group.position.y = Math.abs(Math.sin(now / 80)) * 0.08;
  daughter.group.rotation.y = -0.12 + (gone ? 0.6 : -0.6) * anim.away;
  animateCloud(dt);

  if (!playing && game.phase !== 'ready') {
    dad.leftArm.rotation.x = 0;
    dad.rightArm.rotation.x = 0;
  }
  animateDaughterIdle(dt, t, anim.away === 0 && anim.bath === 0 && (playing || game.phase === 'ready'));
}

// ---------- Детские дела старшей ----------

type Idle = 'none' | 'phone' | 'nose' | 'tug' | 'twirl' | 'hop';
const idle = { kind: 'none' as Idle, t: 0, next: 2.5 };
const IDLE_LENGTH: Record<Idle, number> = { none: 0, phone: 3.2, nose: 2.2, tug: 2.4, twirl: 1.3, hop: 1.6 };

function animateDaughterIdle(dt: number, t: number, allowed: boolean): void {
  const d = world.daughter;
  if (!allowed || reducedMotion) {
    idle.kind = 'none';
    d.head.rotation.set(0, 0, 0);
    d.rightArm.rotation.set(0, 0, 0);
    d.phone.visible = false;
    return;
  }
  if (idle.kind === 'none') {
    idle.next -= dt;
    if (idle.next <= 0) {
      const kinds: Idle[] = ['phone', 'nose', 'tug', 'twirl', 'hop'];
      idle.kind = kinds[Math.floor(Math.random() * kinds.length)];
      idle.t = 0;
    }
  } else {
    idle.t += dt;
    if (idle.t >= IDLE_LENGTH[idle.kind]) {
      idle.kind = 'none';
      idle.next = 2.5 + Math.random() * 4;
    }
  }
  const k = idle.kind === 'none' ? 0 : Math.min(1, idle.t / 0.3, (IDLE_LENGTH[idle.kind] - idle.t) / 0.3);
  d.phone.visible = idle.kind === 'phone';
  d.head.rotation.set(0, 0, 0);
  d.rightArm.rotation.set(0, 0, 0);
  switch (idle.kind) {
    case 'phone':
      // Уткнулась в телефон: рука согнута перед собой, голова опущена.
      d.rightArm.rotation.x = -1.9 * k;
      d.rightArm.rotation.z = 0.5 * k;
      d.head.rotation.x = 0.45 * k;
      d.head.rotation.y = Math.sin(t * 6) * 0.03;
      break;
    case 'nose':
      d.rightArm.rotation.x = -2.5 * k;
      d.rightArm.rotation.z = -1.05 * k;
      d.head.rotation.z = -0.2 * k + Math.sin(t * 14) * 0.03 * k;
      d.head.rotation.y = 0.25 * k;
      break;
    case 'tug': {
      // Дёргает папу за руку: откидывается назад рывками.
      const pull = Math.max(0, Math.sin(idle.t * 7)) * k;
      d.group.rotation.z += -0.32 * pull;
      d.group.position.x += 0.2 * pull;
      world.dad.rightArm.rotation.z += 0.35 * pull;
      world.dad.torso.rotation.z += 0.05 * pull;
      d.head.rotation.x = -0.25 * pull;
      break;
    }
    case 'twirl':
      d.group.rotation.y += (idle.t / IDLE_LENGTH.twirl) * Math.PI * 2;
      d.rightArm.rotation.z = 1.2 * k;
      d.dress.scale.set(1 + 0.15 * k, 1, 1 + 0.15 * k);
      break;
    case 'hop':
      d.group.position.y += Math.abs(Math.sin(idle.t * 9)) * 0.22 * k;
      d.rightArm.rotation.z = 0.6 * k;
      break;
    default:
      d.dress.scale.setScalar(1);
  }
  if (idle.kind !== 'twirl') d.dress.scale.setScalar(1);
}

// ---------- Облако после F ----------

const cloud = world.cloud;

function fartCloud(): void {
  startAttack('butt', 4);
  cloud.age = 0;
  cloud.group.visible = true;
}

function animateCloud(dt: number): void {
  if (!cloud.group.visible) return;
  cloud.age += dt;
  const life = 1.6;
  if (cloud.age >= life) {
    cloud.group.visible = false;
    return;
  }
  const k = cloud.age / life;
  cloud.group.position.copy(world.family.position);
  cloud.group.rotation.y = world.family.rotation.y;
  cloud.puffs.forEach((puff, i) => {
    const grow = 0.3 + k * 1.3;
    const side = i % 2 ? 1 : -1;
    puff.scale.setScalar(grow * (0.7 + (i % 3) * 0.2));
    puff.position.y = 0.7 + k * 1.2 + i * 0.1;
    puff.position.x = side * (0.5 + k * (0.8 + i * 0.25));
    puff.position.z = 0.3 - k * (0.4 + i * 0.25);
  });
  (cloud.puffs[0].material as T.MeshStandardMaterial).opacity = 0.8 * (1 - k * k);
}

// ---------- Главный цикл ----------

overlay('ready');
hud();
let last = performance.now();

function tick(now: number): void {
  const dt = Math.min(Math.max(0, now - last) / 1000, 0.25);
  last = now;
  game.update(dt);
  for (const event of game.events.splice(0)) handleEvent(event);

  animateFamily(dt, now);
  animateClutter(dt);
  animateGoneCards(dt);
  animateImpacts(dt);

  if (finishOverlayMode && now >= finishOverlayAt) {
    overlay(finishOverlayMode);
    finishOverlayMode = '';
  }
  if (now > feedbackUntil) $('feedback').classList.remove('show');
  if (now > waveUntil) $('wave').classList.remove('show');
  if (overlayMode === 'help' && !helpOpen) overlay('');

  drawTasks(game.phase === 'ready' ? now / 1000 : game.elapsed);
  hud();
  renderer.render(world.scene, world.camera);
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  tick(now);
}
requestAnimationFrame(frame);

addEventListener('pagehide', () => {
  world.dispose();
  renderer.dispose();
});

if (import.meta.env.DEV) {
  // Отладочный хук для проверки сцены и игрового цикла из консоли.
  (window as unknown as { __pasha: unknown }).__pasha = { game, world, renderer, startRun, hitTask, taskNodes, tick, idle };
}
