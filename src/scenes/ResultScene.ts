import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getOrCreatePlayerId } from '../services/playerStorage';
import { createRunRecord, getLeaderboard } from '../services/leaderboard';
import type { RunResult } from '../types/game';
import { computeResultStatus, formatTime } from '../utils/resultStatus';

export class ResultScene extends Phaser.Scene {
  private result!: RunResult;
  private submitted = false;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: RunResult): void {
    this.result = { ...data, resultStatus: data.resultStatus || computeResultStatus(data) };
    this.submitted = false;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a);

    const title = this.result.won ? 'Выжил!' : 'D[e]ad';
    this.add
      .text(cx, 60, title, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '32px',
        color: this.result.won ? '#39ff14' : '#ff4757',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 120, this.result.resultStatus, {
        fontSize: '16px',
        color: '#fff',
        align: 'center',
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5);

    const lines = [
      `Время: ${formatTime(this.result.survivalTime)} / ${formatTime(180)}`,
      `Score: ${this.result.score}`,
      `Отбито: ${this.result.tasksDeflected}  Пропущено: ${this.result.tasksMissed}`,
      `Хаос: ${this.result.maxChaosLevel}`,
      '',
      `Малыш: ${this.result.babyFinal}%  Дочь: ${this.result.daughterFinal}%`,
      `Работа: ${this.result.workFinal}%  Энергия: ${this.result.energyFinal}%`,
    ];

    this.add
      .text(cx, 220, lines.join('\n'), {
        fontSize: '14px',
        color: '#ccc',
        align: 'center',
        lineSpacing: 8,
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5);

    this.createButton(cx - 150, 420, 'В РЕЙТИНГ', () => this.submitAndGoLeaderboard());
    this.createButton(cx, 420, 'ЕЩЁ РАЗ', () => this.scene.start('MenuScene'));
    this.createButton(cx + 150, 420, 'МЕНЮ', () => this.scene.start('MenuScene'));
  }

  private async submitAndGoLeaderboard(): Promise<void> {
    if (this.submitted) {
      this.scene.start('LeaderboardScene');
      return;
    }
    this.submitted = true;
    const playerId = getOrCreatePlayerId();
    const record = createRunRecord({
      playerId,
      playerName: this.result.playerName,
      pashaType: this.result.pashaType,
      itemType: this.result.itemId,
      score: this.result.score,
      survivalTime: this.result.survivalTime,
      tasksDeflected: this.result.tasksDeflected,
      tasksMissed: this.result.tasksMissed,
      maxChaosLevel: this.result.maxChaosLevel,
      babyFinal: this.result.babyFinal,
      daughterFinal: this.result.daughterFinal,
      workFinal: this.result.workFinal,
      energyFinal: this.result.energyFinal,
      resultStatus: this.result.resultStatus,
    });
    await getLeaderboard().submitRun(record);
    this.scene.start('LeaderboardScene');
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    this.add
      .text(x, y, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#000',
        backgroundColor: '#39ff14',
        padding: { x: 12, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }
}
