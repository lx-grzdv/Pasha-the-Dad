import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RUN_DURATION_SEC } from '../config/gameConfig';
import {
  COMBO_PHRASES,
  DEFLECT_PHRASES,
  LOW_METER_PHRASES,
  MISS_PHRASES,
  pickRandom,
} from '../config/popupPhrases';
import { ITEMS } from '../config/pashaTypes';
import { LimbHitbox, type ResolvedLimb } from '../entities/LimbHitbox';
import { PashaVisual } from '../entities/Pasha';
import { TaskEntity } from '../entities/Task';
import { DefeatSequence } from '../systems/DefeatSequence';
import { DifficultyRamp } from '../systems/DifficultyRamp';
import { HandStateSystem } from '../systems/HandStateSystem';
import { MeterSystem } from '../systems/MeterSystem';
import { ScoringSystem } from '../systems/ScoringSystem';
import { TaskPileSystem } from '../systems/TaskPileSystem';
import { TaskSpawnSystem } from '../systems/TaskSpawnSystem';
import { AimInput } from '../systems/AimInput';
import { ThrustComboSystem } from '../systems/ThrustComboSystem';
import type { GameSessionConfig, LimbKind, RunResult } from '../types/game';
import { formatTime } from '../utils/resultStatus';

export class GameScene extends Phaser.Scene {
  private session!: GameSessionConfig;
  private pasha!: PashaVisual;
  private limb!: LimbHitbox;
  private hands = new HandStateSystem();
  private meters = new MeterSystem();
  private scoring = new ScoringSystem();
  private ramp = new DifficultyRamp();
  private spawner = new TaskSpawnSystem();
  private pile!: TaskPileSystem;
  private defeatSeq!: DefeatSequence;
  private thrustCombo = new ThrustComboSystem();
  private aimInput = new AimInput();

  private tasks: TaskEntity[] = [];
  private elapsedSec = 0;
  private spawnTimer = 0;
  private swinging = false;
  private swingTimer = 0;
  private gameOver = false;
  private won = false;
  private basePashaY = 0;
  private lastSink = 0;
  private warnedMeters = new Set<string>();
  private lastComboPhrase = 0;

  private hudTimer!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudCombo!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudLimb!: Phaser.GameObjects.Text;
  private meterBars: Record<string, { bar: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = {};
  private cooldownTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSessionConfig): void {
    this.session = data;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 40;
    this.basePashaY = cy;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bg);

    this.hands.reset();
    this.meters.reset();
    this.scoring.reset();
    this.tasks = [];
    this.elapsedSec = 0;
    this.spawnTimer = 0;
    this.gameOver = false;
    this.won = false;
    this.lastSink = 0;
    this.warnedMeters.clear();
    this.lastComboPhrase = 0;
    this.thrustCombo.reset();

    this.pile = new TaskPileSystem(this, cx, cy + 50);
    this.pasha = new PashaVisual(this, cx, cy);
    this.limb = new LimbHitbox(this);
    this.defeatSeq = new DefeatSequence(this, this.pile, () => this.goToResult());

    this.createHud();
    this.setupInput();
    this.aimInput.bind(this);

    this.hudHint = this.add
      .text(cx, GAME_HEIGHT - 70, 'Мышь или стрелки — направление. Чередуй ноги для пах-комбо. Q/E/R — освободить руки', {
        fontSize: '13px',
        color: '#39ff14',
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5)
      .setDepth(50);
  }

  private createHud(): void {
    this.hudTimer = this.add.text(20, 15, '03:00', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#fff',
    }).setDepth(50);

    this.hudScore = this.add.text(GAME_WIDTH - 20, 15, '0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#39ff14',
    }).setOrigin(1, 0).setDepth(50);

    this.hudCombo = this.add.text(GAME_WIDTH - 20, 40, '', {
      fontSize: '12px',
      color: '#ffd93d',
    }).setOrigin(1, 0).setDepth(50);

    this.hudLimb = this.add.text(20, 40, 'Ноги', {
      fontSize: '12px',
      color: '#ff6b9d',
    }).setDepth(50);

    const meters: { key: string; label: string; color: number; y: number }[] = [
      { key: 'baby', label: 'Малыш', color: COLORS.baby, y: 70 },
      { key: 'daughter', label: 'Дочь', color: COLORS.daughter, y: 95 },
      { key: 'work', label: 'Работа', color: COLORS.work, y: 120 },
      { key: 'energy', label: 'Энергия', color: 0x69db7c, y: 145 },
      { key: 'chaos', label: 'Хаос', color: COLORS.chaos, y: 170 },
    ];

    for (const m of meters) {
      this.add.rectangle(120, m.y, 200, 14, COLORS.meterBg).setDepth(50).setOrigin(0, 0.5);
      const bar = this.add.rectangle(120, m.y, 200, 14, m.color).setDepth(51).setOrigin(0, 0.5);
      const label = this.add.text(20, m.y, m.label, { fontSize: '11px', color: '#fff' }).setDepth(50).setOrigin(0, 0.5);
      this.meterBars[m.key] = { bar, label };
    }

    const keys = ['Q: малыш', 'E: сад', 'R: туалет'];
    keys.forEach((k, i) => {
      const t = this.add.text(GAME_WIDTH - 130, 70 + i * 22, k, {
        fontSize: '11px',
        color: '#888',
      }).setDepth(50);
      this.cooldownTexts.push(t);
    });
  }

  private setupInput(): void {
    this.input.on('pointerdown', () => this.trySwing());
    this.input.keyboard?.on('keydown-SPACE', () => this.trySwing());
    this.input.keyboard?.on('keydown-Q', () => this.tryAction('toss'));
    this.input.keyboard?.on('keydown-E', () => this.tryAction('kindergarten'));
    this.input.keyboard?.on('keydown-R', () => this.tryAction('bathroom'));
  }

  private trySwing(): void {
    if (this.gameOver || this.swinging || this.defeatSeq.isRunning()) return;
    this.swinging = true;
    this.swingTimer = 150;
    this.meters.onHit(ITEMS[this.session.itemId].energyCost);
    const center = this.pasha.getCenter();
    const aim = this.aimInput.getAimPoint(center.x, center.y, this.input.activePointer);
    const resolved = this.limb.resolve(center.x, center.y, aim.x, aim.y, this.hands.state);
    this.pasha.playLimbSwing(resolved.limb, this);
    this.limb.flashHit(resolved);
    const hitCount = this.checkHits(resolved);
    if (hitCount > 0) {
      this.showPopup(pickRandom(DEFLECT_PHRASES), '#39ff14');
    }
  }

  private tryAction(kind: 'toss' | 'kindergarten' | 'bathroom'): void {
    if (this.gameOver || this.defeatSeq.isRunning()) return;
    const now = this.time.now;
    let ok = false;
    let msg = '';
    if (kind === 'toss') {
      ok = this.hands.tossBaby(now);
      msg = ok ? 'Подбросил малыша!' : '';
    } else if (kind === 'kindergarten') {
      ok = this.hands.sendToKindergarten(now);
      msg = ok ? 'Дочь в сад!' : '';
    } else {
      ok = this.hands.hideInBathroom(now);
      msg = ok ? 'Туалет! Работа не ждёт...' : '';
    }
    if (msg) this.showPopup(msg);
  }

  private showPopup(text: string, color = '#39ff14'): void {
    const c = this.pasha.getCenter();
    const t = this.add
      .text(c.x, c.y - 100, text, {
        fontSize: '14px',
        color,
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private checkHits(resolved: ResolvedLimb): number {
    const hit = this.limb.getHitCircle(resolved);
    const item = ITEMS[this.session.itemId];
    const limbPower = this.limb.getPowerMod(resolved.limb);
    let hits = 0;

    for (const task of [...this.tasks]) {
      if (task.state !== 'flying') continue;
      const dist = Phaser.Math.Distance.Between(hit.x, hit.y, task.container.x, task.container.y);
      if (dist < hit.r) {
        let bonus = 0;
        if (task.def.type === 'baby') bonus = item.babyBonus;
        if (task.def.type === 'work') bonus = item.workBonus;
        const thrust = this.thrustCombo.onDeflect(resolved.limb);
        const prevStreak = this.scoring.getComboStreak();
        this.scoring.onDeflect(task.def, item, bonus, limbPower, thrust.bonusMult);
        this.meters.onTaskDeflected(task.def.type, item.energyCost);
        task.deflect(this);
        this.tasks = this.tasks.filter((t) => t !== task);
        hits++;

        if (thrust.phrase) {
          this.showPopup(thrust.phrase, '#ff6b9d');
        }

        const streak = this.scoring.getComboStreak();
        const phrase = COMBO_PHRASES[streak];
        if (phrase && streak > this.lastComboPhrase) {
          this.lastComboPhrase = streak;
          this.showPopup(phrase, '#ffd93d');
        } else if (prevStreak === 0 && streak === 1) {
          // no spam on first hit
        }
      }
    }
    return hits;
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.defeatSeq.isRunning()) return;

    const deltaSec = delta / 1000;
    this.elapsedSec += deltaSec;
    this.hands.update(this.time.now);
    this.meters.tick(deltaSec, this.hands.state);

    const remaining = RUN_DURATION_SEC - this.elapsedSec;
    if (remaining <= 0) {
      this.endGame(true);
      return;
    }

    const fail = this.meters.getCriticalFailure();
    if (fail) {
      this.endGame(false);
      return;
    }

    this.checkLowMeters();

    const params = this.ramp.getSpawnParams(this.elapsedSec, this.meters.values.chaos);
    this.spawnTimer += delta;
    if (this.spawnTimer >= params.intervalMs) {
      this.spawnTimer = 0;
      for (let i = 0; i < params.burst; i++) {
        this.spawnTask(params.speed);
      }
    }

    const center = this.pasha.getCenter();
    for (const task of [...this.tasks]) {
      if (task.state !== 'flying') continue;
      const reached = task.update(deltaSec, center.x, center.y);
      if (reached) {
        task.markMissed();
        this.scoring.onMiss();
        this.meters.onTaskMissed(task.def.type, task.def.meterDamage, task.def.chaosOnMiss);
        this.pile.addStuck(task.def);
        task.destroy();
        this.tasks = this.tasks.filter((t) => t !== task);
        if (Math.random() < 0.35) {
          this.showPopup(pickRandom(MISS_PHRASES), '#ff6b6b');
        }
      }
    }

    const sink = this.pile.getSinkOffset();
    if (sink !== this.lastSink) {
      this.pasha.setPosition(center.x, this.basePashaY + sink);
      this.lastSink = sink;
    }

    this.pasha.updateVisuals(
      this.hands.state.leftHandFree,
      this.hands.state.rightHandFree,
      this.hands.state.inBathroom
    );

    const aim = this.aimInput.getAimPoint(center.x, center.y, this.input.activePointer);
    const resolved = this.limb.resolve(center.x, center.y, aim.x, aim.y, this.hands.state);
    const limbLabels: Record<LimbKind, string> = {
      leftFoot: 'Левая нога',
      rightFoot: 'Правая нога',
      leftHand: 'Левая рука',
      rightHand: 'Правая рука',
      bothHands: 'Обе руки!',
    };
    const thrustHint =
      this.thrustCombo.streak >= 2 ? ` · пах x${this.thrustCombo.streak}` : '';
    this.hudLimb.setText(limbLabels[resolved.limb] + thrustHint);

    if (this.swinging) {
      this.swingTimer -= delta;
      if (this.swingTimer <= 0) this.swinging = false;
    }

    this.limb.draw(resolved, this.swinging);

    this.updateHud(remaining);
  }

  private checkLowMeters(): void {
    const checks: { key: keyof typeof LOW_METER_PHRASES; value: number }[] = [
      { key: 'baby', value: this.meters.values.baby },
      { key: 'daughter', value: this.meters.values.daughter },
      { key: 'work', value: this.meters.values.work },
      { key: 'energy', value: this.meters.values.energy },
    ];
    for (const { key, value } of checks) {
      if (value < 25 && !this.warnedMeters.has(key)) {
        this.warnedMeters.add(key);
        this.showPopup(LOW_METER_PHRASES[key], '#ff922b');
      }
      if (value > 35) this.warnedMeters.delete(key);
    }
  }

  private spawnTask(speed: number): void {
    const center = this.pasha.getCenter();
    const task = this.spawner.spawnFromEdge(this, center.x, center.y, speed);
    this.tasks.push(task);
  }

  private updateHud(remaining: number): void {
    this.hudTimer.setText(formatTime(remaining));
    this.hudScore.setText(String(this.scoring.score));
    const combo = this.scoring.getComboStreak();
    this.hudCombo.setText(combo >= 3 ? `x${this.scoring.getMultiplier()} (${combo})` : '');

    const v = this.meters.values;
    const widths: Record<string, number> = {
      baby: (v.baby / 100) * 200,
      daughter: (v.daughter / 100) * 200,
      work: (v.work / 100) * 200,
      energy: (v.energy / 100) * 200,
      chaos: (v.chaos / 10) * 200,
    };
    for (const [key, w] of Object.entries(widths)) {
      this.meterBars[key].bar.width = Math.max(0, w);
    }

    const cd = this.hands.getCooldownRemaining(this.time.now);
    const labels = [
      cd.q > 0 ? `Q: ${(cd.q / 1000).toFixed(1)}s` : 'Q: малыш ✓',
      cd.e > 0 ? `E: ${(cd.e / 1000).toFixed(1)}s` : 'E: сад ✓',
      cd.r > 0 ? `R: ${(cd.r / 1000).toFixed(1)}s` : 'R: туалет ✓',
    ];
    this.cooldownTexts.forEach((t, i) => {
      t.setText(labels[i]);
      t.setColor(cd[(['q', 'e', 'r'] as const)[i]] > 0 ? '#888' : '#39ff14');
    });

    if (this.elapsedSec > 15) this.hudHint.setVisible(false);
  }

  private endGame(won: boolean): void {
    this.gameOver = true;
    this.won = won;
    this.scoring.finalize(Math.floor(this.elapsedSec), this.meters.getBalanceBonus(), won);

    if (!won) {
      const flying = this.tasks.filter((t) => t.state === 'flying').map((t) => t.def);
      for (const t of this.tasks) t.destroy();
      this.tasks = [];
      const c = this.pasha.getCenter();
      this.defeatSeq.play(c.x, c.y, flying);
    } else {
      this.time.delayedCall(500, () => this.goToResult());
    }
  }

  private goToResult(): void {
    const result: RunResult = {
      score: this.scoring.score,
      survivalTime: Math.floor(this.elapsedSec),
      tasksDeflected: this.scoring.tasksDeflected,
      tasksMissed: this.scoring.tasksMissed,
      maxChaosLevel: Math.floor(this.meters.maxChaos),
      babyFinal: Math.floor(this.meters.values.baby),
      daughterFinal: Math.floor(this.meters.values.daughter),
      workFinal: Math.floor(this.meters.values.work),
      energyFinal: Math.floor(this.meters.values.energy),
      won: this.won,
      resultStatus: '',
      pashaType: this.session.pashaType,
      itemId: this.session.itemId,
      playerName: this.session.playerName,
    };
    this.scene.start('ResultScene', result);
  }
}
