import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getOrCreatePlayerId } from '../services/playerStorage';
import { getLeaderboard } from '../services/leaderboard';
import type { RunRecord } from '../services/leaderboard';
import { HybridLeaderboard } from '../services/leaderboard/HybridLeaderboard';
import { formatTime } from '../utils/resultStatus';
import { UI, addBackdrop, addBodyText, addNeonButton, addPanel, addTag, addTitle } from '../ui/theme';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create(): Promise<void> {
    const cx = GAME_WIDTH / 2;
    addBackdrop(this);

    addTitle(this, cx, 48, 'Top D[e]ads', '24px');

    const lb = getLeaderboard();
    const isGlobal =
      lb instanceof HybridLeaderboard ? await lb.isGlobal() : import.meta.env.VITE_LEADERBOARD_ADAPTER === 'remote';

    addTag(this, cx, 86, isGlobal ? 'глобальный рейтинг' : 'локальный рейтинг', UI.colors.amber);
    const top = await lb.getTopRuns(10);
    const today = await lb.getTodayTopRuns(5);
    const best = await lb.getPlayerBest(getOrCreatePlayerId());

    addPanel(this, cx, 312, 780, 390, { accent: UI.colors.blue, depth: 0 });

    let y = 132;
    addBodyText(this, 112, y, 'Все время', '13px', UI.colors.amberText);
    y += 26;
    y = this.renderList(top, 112, y, 10);
    y += 18;

    addBodyText(this, 112, y, 'Сегодня', '13px', UI.colors.amberText);
    y += 26;
    y = this.renderList(today, 112, y, 5);
    y += 18;

    if (best) {
      addBodyText(this, 112, y, 'Твой лучший', '13px', UI.colors.blueText);
      y += 26;
      addBodyText(this, 112, y, this.formatRow(best, 0), '13px', UI.colors.text);
    }

    addNeonButton(this, cx - 96, GAME_HEIGHT - 52, 'ИГРАТЬ', () => this.scene.start('MenuScene'), {
      width: 150,
      accent: UI.colors.mint,
      fontSize: '11px',
    });
    addNeonButton(this, cx + 96, GAME_HEIGHT - 52, 'МЕНЮ', () => this.scene.start('MenuScene'), {
      width: 128,
      accent: UI.colors.blue,
      fontSize: '11px',
    });
  }

  private renderList(runs: RunRecord[], x: number, startY: number, max: number): number {
    let y = startY;
    if (runs.length === 0) {
      addBodyText(this, x, y, 'Пока пусто — сыграй первым!', '12px', UI.colors.faint);
      return y + 20;
    }
    runs.slice(0, max).forEach((r, i) => {
      const color = i < 3 ? UI.colors.text : UI.colors.muted;
      addBodyText(this, x, y, this.formatRow(r, i + 1), '12px', color);
      y += 18;
    });
    return y;
  }

  private formatRow(r: RunRecord, rank: number): string {
    const prefix = rank > 0 ? `${rank}. ` : '';
    return `${prefix}${r.playerName} — ${r.score} pts (${formatTime(r.survivalTime)})`;
  }

}
