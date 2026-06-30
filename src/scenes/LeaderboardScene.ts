import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getOrCreatePlayerId } from '../services/playerStorage';
import { getLeaderboard } from '../services/leaderboard';
import type { RunRecord } from '../services/leaderboard';
import { formatTime } from '../utils/resultStatus';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create(): Promise<void> {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a);

    this.add
      .text(cx, 40, 'Top D[e]ads', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '22px',
        color: '#39ff14',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 75, 'Рейтинг на этом устройстве (БД подключим позже)', {
        fontSize: '11px',
        color: '#666',
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5);

    const lb = getLeaderboard();
    const top = await lb.getTopRuns(10);
    const today = await lb.getTodayTopRuns(5);
    const best = await lb.getPlayerBest(getOrCreatePlayerId());

    let y = 110;
    this.add.text(40, y, '— Все время —', { fontSize: '12px', color: '#ffd93d' });
    y += 25;
    y = this.renderList(top, 40, y, 10);
    y += 15;

    this.add.text(40, y, '— Сегодня —', { fontSize: '12px', color: '#ffd93d' });
    y += 25;
    y = this.renderList(today, 40, y, 5);
    y += 15;

    if (best) {
      this.add.text(40, y, '— Твой лучший —', { fontSize: '12px', color: '#4dabf7' });
      y += 25;
      this.add.text(40, y, this.formatRow(best, 0), {
        fontSize: '12px',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      });
    }

    this.createButton(cx - 100, GAME_HEIGHT - 50, 'ИГРАТЬ', () => this.scene.start('MenuScene'));
    this.createButton(cx + 100, GAME_HEIGHT - 50, 'МЕНЮ', () => this.scene.start('MenuScene'));
  }

  private renderList(runs: RunRecord[], x: number, startY: number, max: number): number {
    let y = startY;
    if (runs.length === 0) {
      this.add.text(x, y, 'Пока пусто — сыграй первым!', { fontSize: '12px', color: '#888' });
      return y + 20;
    }
    runs.slice(0, max).forEach((r, i) => {
      this.add.text(x, y, this.formatRow(r, i + 1), {
        fontSize: '11px',
        color: '#ccc',
        fontFamily: 'system-ui, sans-serif',
      });
      y += 18;
    });
    return y;
  }

  private formatRow(r: RunRecord, rank: number): string {
    const prefix = rank > 0 ? `${rank}. ` : '';
    return `${prefix}${r.playerName} — ${r.score} pts (${formatTime(r.survivalTime)})`;
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    this.add
      .text(x, y, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#000',
        backgroundColor: '#39ff14',
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }
}
