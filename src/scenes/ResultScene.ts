import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getOrCreatePlayerId } from '../services/playerStorage';
import { createRunRecord, getLeaderboard } from '../services/leaderboard';
import type { RunResult } from '../types/game';
import { computeResultStatus, formatTime } from '../utils/resultStatus';
import { UI, addBackdrop, addBodyText, addNeonButton, addPanel, addTag, addTitle } from '../ui/theme';

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
    addBackdrop(this);

    const title = this.result.won ? 'Выжил!' : 'D[e]ad';
    const accent = this.result.won ? UI.colors.mint : UI.colors.danger;
    addTitle(this, cx, 70, title, '32px', this.result.won ? UI.colors.mintText : UI.colors.dangerText);
    addTag(this, cx, 118, this.result.won ? 'день пережит' : 'день победил', accent);

    addBodyText(this, cx, 158, this.result.resultStatus, '16px', UI.colors.text, 'center')
      .setOrigin(0.5);

    addPanel(this, cx, 284, 600, 214, { accent, depth: 0 });
    const lines = [
      `Время: ${formatTime(this.result.survivalTime)} / ${formatTime(180)}`,
      `Score: ${this.result.score}`,
      `Отбито: ${this.result.tasksDeflected}  Пропущено: ${this.result.tasksMissed}`,
      `Хаос: ${this.result.maxChaosLevel}`,
      '',
      `Малыш: ${this.result.babyFinal}%  Дочь: ${this.result.daughterFinal}%`,
      `Работа: ${this.result.workFinal}%  Энергия: ${this.result.energyFinal}%`,
    ];

    addBodyText(this, cx, 284, lines.join('\n'), '15px', UI.colors.muted, 'center')
      .setLineSpacing(8)
      .setOrigin(0.5);

    addNeonButton(this, cx - 170, 458, 'В РЕЙТИНГ', () => this.submitAndGoLeaderboard(), {
      width: 176,
      accent: UI.colors.amber,
      fontSize: '10px',
    });
    addNeonButton(this, cx, 458, 'ЕЩЁ РАЗ', () => this.scene.start('MenuScene'), {
      width: 144,
      accent: UI.colors.mint,
      fontSize: '10px',
    });
    addNeonButton(this, cx + 156, 458, 'МЕНЮ', () => this.scene.start('MenuScene'), {
      width: 120,
      accent: UI.colors.blue,
      fontSize: '10px',
    });

    addBodyText(this, cx, GAME_HEIGHT - 48, 'Enter — ещё раз', '12px', UI.colors.faint, 'center').setOrigin(0.5);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('MenuScene'));
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

}
