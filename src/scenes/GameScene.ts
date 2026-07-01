import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RUN_DURATION_SEC, WAVES } from '../config/gameConfig';
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
import { UI, addBackdrop, addPanel } from '../ui/theme';
import {
  isMuted,
  sfxAction,
  sfxBonk,
  sfxCombo,
  sfxDefeat,
  sfxDeflect,
  sfxDenied,
  sfxLowMeter,
  sfxMiss,
  sfxPartialHit,
  sfxPause,
  sfxStep,
  sfxThrust,
  sfxWave,
  sfxWin,
  toggleMute,
} from '../audio/sfx';

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
  private triggeredWaves = new Set<number>();

  private paused = false;
  private pausedTotal = 0;
  private pauseStartedAt = 0;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private introRunning = false;

  private hitStopMs = 0;
  private chaosShakeAcc = 0;

  private hudTimer!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudCombo!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudLimb!: Phaser.GameObjects.Text;
  private hudAimMode!: Phaser.GameObjects.Text;
  private meterBars: Record<
    string,
    { bar: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text }
  > = {};
  private cooldownTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSessionConfig): void {
    this.session = data;
  }

  /** Игровое время с учётом паузы — все кулдауны считаются от него */
  private now(): number {
    return this.time.now - this.pausedTotal;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 40;
    this.basePashaY = cy;

    addBackdrop(this, { vignette: false });

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
    this.triggeredWaves.clear();
    this.paused = false;
    this.pausedTotal = 0;
    this.hitStopMs = 0;
    this.chaosShakeAcc = 0;
    this.pauseOverlay = null;

    this.pile = new TaskPileSystem(this, cx, cy + 50);
    // Интро: Паша вбегает слева, дела начинают лететь только после прибытия
    this.pasha = new PashaVisual(this, -90, cy);
    this.introRunning = true;
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 170, () => sfxStep());
    }
    this.pasha.playRunIn(this, cx, 1100, () => {
      this.introRunning = false;
      this.showPopup('Так, погнали', UI.colors.mintText);
    });
    this.limb = new LimbHitbox(this);
    this.defeatSeq = new DefeatSequence(this, this.pile, () => this.goToResult());

    this.createHud();
    this.updateHud(RUN_DURATION_SEC);
    this.setupInput();
    this.aimInput.bind(this);

    this.hudHint = this.add
      .text(cx, GAME_HEIGHT - 70, 'Ниже пояса — ноги, выше — руки, над головой — башка. Чередуй ноги для пах-комбо. Q/E/R — руки, P — пауза', {
        fontSize: '13px',
        color: UI.colors.mintText,
        fontFamily: UI.font.body,
      })
      .setOrigin(0.5)
      .setDepth(50);
  }

  private createHud(): void {
    this.meterBars = {};
    this.cooldownTexts = [];

    addPanel(this, 154, 136, 284, 188, { alpha: 0.8, depth: 45 });
    addPanel(this, GAME_WIDTH - 110, 112, 190, 132, { alpha: 0.8, depth: 45 });

    this.hudTimer = this.add.text(20, 15, '03:00', {
      fontFamily: UI.font.pixel,
      fontSize: '16px',
      color: UI.colors.text,
    }).setDepth(50);

    this.hudScore = this.add.text(GAME_WIDTH - 20, 15, '0', {
      fontFamily: UI.font.pixel,
      fontSize: '16px',
      color: UI.colors.mintText,
    }).setOrigin(1, 0).setDepth(50);

    this.hudCombo = this.add.text(GAME_WIDTH - 20, 40, '', {
      fontSize: '12px',
      color: UI.colors.amberText,
      fontFamily: UI.font.mono,
    }).setOrigin(1, 0).setDepth(50);

    this.hudLimb = this.add.text(22, 44, 'Ноги', {
      fontSize: '12px',
      color: UI.colors.pinkText,
      fontFamily: UI.font.mono,
    }).setDepth(50);

    this.hudAimMode = this.add.text(22, 62, 'прицел: стрелки', {
      fontSize: '11px',
      color: UI.colors.faint,
      fontFamily: UI.font.mono,
    }).setDepth(50);

    const meters: { key: string; label: string; color: number; y: number }[] = [
      { key: 'baby', label: 'малыш', color: COLORS.baby, y: 92 },
      { key: 'daughter', label: 'дочь', color: COLORS.daughter, y: 118 },
      { key: 'work', label: 'работа', color: COLORS.work, y: 144 },
      { key: 'energy', label: 'энергия', color: 0x7dff3a, y: 170 },
      { key: 'chaos', label: 'хаос', color: COLORS.chaos, y: 196 },
    ];

    for (const m of meters) {
      this.add.rectangle(104, m.y, 152, 8, COLORS.meterBg, 0.95).setDepth(50).setOrigin(0, 0.5);
      const bar = this.add.rectangle(104, m.y, 152, 8, m.color, 0.95).setDepth(51).setOrigin(0, 0.5);
      const label = this.add.text(22, m.y, m.label, {
        fontSize: '11px',
        color: UI.colors.text,
        fontFamily: UI.font.mono,
      }).setDepth(50).setOrigin(0, 0.5);
      const value = this.add.text(264, m.y, '100%', {
        fontSize: '10px',
        color: UI.colors.faint,
        fontFamily: UI.font.mono,
      }).setDepth(50).setOrigin(0, 0.5);
      this.meterBars[m.key] = { bar, label, value };
    }

    const keys = ['Q  малыш', 'E  сад', 'R  туалет'];
    keys.forEach((k, i) => {
      const t = this.add.text(GAME_WIDTH - 184, 72 + i * 26, k, {
        fontSize: '12px',
        color: UI.colors.faint,
        fontFamily: UI.font.mono,
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
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => {
      const muted = toggleMute();
      this.showPopup(muted ? 'Звук выкл' : 'Звук вкл', UI.colors.faint);
    });
  }

  private togglePause(): void {
    if (this.gameOver || this.introRunning || this.defeatSeq.isRunning()) return;

    if (!this.paused) {
      this.paused = true;
      this.pauseStartedAt = this.time.now;
      this.tweens.pauseAll();
      sfxPause(true);

      const cx = GAME_WIDTH / 2;
      const dim = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.66);
      const title = this.add.text(cx, GAME_HEIGHT / 2 - 30, 'ПАУЗА', {
        fontFamily: UI.font.pixel,
        fontSize: '32px',
        color: UI.colors.mintText,
      }).setOrigin(0.5).setShadow(3, 3, '#000000', 0, true, true);
      const hint = this.add.text(cx, GAME_HEIGHT / 2 + 24, 'P или Esc — продолжить', {
        fontSize: '14px',
        color: UI.colors.muted,
        fontFamily: UI.font.body,
      }).setOrigin(0.5);
      this.pauseOverlay = this.add.container(0, 0, [dim, title, hint]).setDepth(200);
    } else {
      this.paused = false;
      this.pausedTotal += this.time.now - this.pauseStartedAt;
      this.tweens.resumeAll();
      sfxPause(false);
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
    }
  }

  private trySwing(): void {
    if (this.gameOver || this.paused || this.introRunning || this.swinging || this.defeatSeq.isRunning()) return;
    this.swinging = true;
    this.swingTimer = 180;
    this.meters.onHit(ITEMS[this.session.itemId].energyCost);
    const center = this.pasha.getCenter();
    const aim = this.aimInput.getAimPoint(center.x, center.y, this.input.activePointer);
    const resolved = this.limb.resolve(center.x, center.y, aim.x, aim.y, this.hands.state);
    this.pasha.playLimbSwing(resolved.limb, this);
    this.limb.flashHit(resolved);
    const hitCount = this.checkHits(resolved);
    if (hitCount > 0) {
      this.showPopup(pickRandom(DEFLECT_PHRASES), UI.colors.mintText);
      this.hitStopMs = hitCount > 1 ? 55 : 30;
    }
  }

  private tryAction(kind: 'toss' | 'kindergarten' | 'bathroom'): void {
    if (this.gameOver || this.paused || this.introRunning || this.defeatSeq.isRunning()) return;
    const now = this.now();
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
    if (msg) {
      sfxAction();
      this.showPopup(msg);
    } else if (!ok) {
      sfxDenied();
      this.showPopup('Ещё не готово', UI.colors.faint);
    }
  }

  private showPopup(text: string, color = UI.colors.mintText): void {
    const c = this.pasha.getCenter();
    const t = this.add
      .text(c.x, c.y - 100, text, {
        fontSize: '14px',
        color,
        fontFamily: UI.font.body,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private announceWave(label: string): void {
    sfxWave();
    const t = this.add
      .text(GAME_WIDTH / 2, 250, label, {
        fontFamily: UI.font.pixel,
        fontSize: '22px',
        color: UI.colors.orangeText,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setShadow(3, 3, '#000000', 0, true, true)
      .setScale(0.6)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 220, delay: 900, duration: 400, onComplete: () => t.destroy() });
      },
    });
  }

  private checkWaves(): void {
    WAVES.forEach((wave, index) => {
      if (this.triggeredWaves.has(index) || this.elapsedSec < wave.atSec) return;
      this.triggeredWaves.add(index);
      this.announceWave(wave.label);
      const center = this.pasha.getCenter();
      const params = this.ramp.getSpawnParams(this.elapsedSec, this.meters.values.chaos);
      for (let i = 0; i < wave.count; i++) {
        this.time.delayedCall(300 + i * 340, () => {
          if (this.gameOver || this.defeatSeq.isRunning()) return;
          const task = this.spawner.spawnType(this, wave.type, center.x, center.y, params.speed, this.getTargetJitter());
          this.tasks.push(task);
        });
      }
    });
  }

  /** При высоком хаосе задачи целятся не точно в центр — траектории расползаются */
  private getTargetJitter(): number {
    const chaos = this.meters.values.chaos;
    return chaos > 5 ? Math.floor((chaos - 5) * 14) : 0;
  }

  private checkHits(resolved: ResolvedLimb): number {
    const hit = this.limb.getHitCircle(resolved);
    const item = ITEMS[this.session.itemId];
    const limbPower = this.limb.getPowerMod(resolved.limb);
    const effectiveR = hit.r * item.radiusMod;
    let hits = 0;

    for (const task of [...this.tasks]) {
      if (task.state !== 'flying') continue;
      const dist = Phaser.Math.Distance.Between(hit.x, hit.y, task.container.x, task.container.y);
      if (dist < effectiveR) {
        const destroyed = task.hit(this);
        if (!destroyed) {
          sfxPartialHit();
          this.showPopup('Ещё раз!', UI.colors.blueText);
          continue;
        }

        let bonus = 0;
        if (task.def.type === 'baby') bonus = item.babyBonus;
        if (task.def.type === 'work') bonus = item.workBonus;
        const thrust = this.thrustCombo.onDeflect(resolved.limb);
        this.scoring.onDeflect(task.def, item, bonus, limbPower, thrust.bonusMult);
        this.meters.onTaskDeflected(task.def.type, item.energyCost);
        this.tasks = this.tasks.filter((t) => t !== task);
        hits++;
        if (resolved.limb === 'head') {
          sfxBonk();
        } else {
          sfxDeflect();
        }

        if (thrust.phrase) {
          sfxThrust(thrust.streak);
          this.showPopup(thrust.phrase, UI.colors.pinkText);
        }

        const streak = this.scoring.getComboStreak();
        const phrase = COMBO_PHRASES[streak];
        if (phrase && streak > this.lastComboPhrase) {
          this.lastComboPhrase = streak;
          sfxCombo();
          this.showPopup(phrase, UI.colors.amberText);
        }
      }
    }
    return hits;
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.paused || this.introRunning || this.defeatSeq.isRunning()) return;

    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta;
      return;
    }

    const deltaSec = delta / 1000;
    this.elapsedSec += deltaSec;
    this.hands.update(this.now());
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
    this.checkWaves();

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
        sfxMiss();
        this.cameras.main.shake(120, 0.004);
        if (Math.random() < 0.35) {
          this.showPopup(pickRandom(MISS_PHRASES), UI.colors.dangerText);
        }
      }
    }

    // Высокий хаос физически ощущается: экран потряхивает
    const chaos = this.meters.values.chaos;
    if (chaos > 6) {
      this.chaosShakeAcc += delta;
      if (this.chaosShakeAcc > 2200) {
        this.chaosShakeAcc = 0;
        this.cameras.main.shake(140, 0.0016 * (chaos - 5));
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
    this.pasha.setMoodByEnergy(this.meters.values.energy);

    const aim = this.aimInput.getAimPoint(center.x, center.y, this.input.activePointer);
    const resolved = this.limb.resolve(center.x, center.y, aim.x, aim.y, this.hands.state);
    const limbLabels: Record<LimbKind, string> = {
      leftFoot: 'Левая нога',
      rightFoot: 'Правая нога',
      leftHand: 'Левая рука',
      rightHand: 'Правая рука',
      bothHands: 'Обе руки!',
      head: 'Башкой!',
    };
    const thrustHint =
      this.thrustCombo.streak >= 2 ? ` · пах x${this.thrustCombo.streak}` : '';
    this.hudLimb.setText(limbLabels[resolved.limb] + thrustHint);
    this.hudAimMode.setText(`прицел: ${aim.fromKeyboard ? 'стрелки' : 'мышь'}${isMuted() ? ' · без звука' : ''}`);

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
        sfxLowMeter();
        this.showPopup(LOW_METER_PHRASES[key], UI.colors.orangeText);
      }
      if (value > 35) this.warnedMeters.delete(key);
    }
  }

  private spawnTask(speed: number): void {
    const center = this.pasha.getCenter();
    const task = this.spawner.spawnFromEdge(this, center.x, center.y, speed, this.meters.values, this.getTargetJitter());
    this.tasks.push(task);
  }

  private updateHud(remaining: number): void {
    this.hudTimer.setText(formatTime(remaining));
    this.hudScore.setText(String(this.scoring.score));
    const combo = this.scoring.getComboStreak();
    this.hudCombo.setText(combo >= 3 ? `x${this.scoring.getMultiplier()} (${combo})` : '');

    const v = this.meters.values;
    const widths: Record<string, number> = {
      baby: (v.baby / 100) * 152,
      daughter: (v.daughter / 100) * 152,
      work: (v.work / 100) * 152,
      energy: (v.energy / 100) * 152,
      chaos: (v.chaos / 10) * 152,
    };
    const values: Record<string, string> = {
      baby: `${Math.floor(v.baby)}%`,
      daughter: `${Math.floor(v.daughter)}%`,
      work: `${Math.floor(v.work)}%`,
      energy: `${Math.floor(v.energy)}%`,
      chaos: v.chaos.toFixed(1),
    };
    for (const [key, w] of Object.entries(widths)) {
      const meter = this.meterBars[key];
      meter.bar.width = Math.max(0, w);
      meter.value.setText(values[key]);
      const isDanger = key === 'chaos' ? v.chaos > 7 : Number.parseFloat(values[key]) < 25;
      meter.value.setColor(isDanger ? UI.colors.dangerText : UI.colors.faint);
    }

    const cd = this.hands.getCooldownRemaining(this.now());
    const labels = [
      cd.q > 0 ? `Q  ${(cd.q / 1000).toFixed(1)}s` : 'Q  малыш готов',
      cd.e > 0 ? `E  ${(cd.e / 1000).toFixed(1)}s` : 'E  сад готов',
      cd.r > 0 ? `R  ${(cd.r / 1000).toFixed(1)}s` : 'R  туалет готов',
    ];
    this.cooldownTexts.forEach((t, i) => {
      t.setText(labels[i]);
      t.setColor(cd[(['q', 'e', 'r'] as const)[i]] > 0 ? UI.colors.faint : UI.colors.mintText);
    });

    if (this.elapsedSec > 15) this.hudHint.setVisible(false);
  }

  private endGame(won: boolean): void {
    this.gameOver = true;
    this.won = won;
    this.scoring.finalize(Math.floor(this.elapsedSec), this.meters.getBalanceBonus(), won);

    if (!won) {
      sfxDefeat();
      this.cameras.main.shake(400, 0.012);
      this.pasha.setMood('dead');
      const flying = this.tasks.filter((t) => t.state === 'flying').map((t) => t.def);
      for (const t of this.tasks) t.destroy();
      this.tasks = [];
      const c = this.pasha.getCenter();
      this.defeatSeq.play(c.x, c.y, flying);
    } else {
      sfxWin();
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
