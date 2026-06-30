import Phaser from 'phaser';
import { PILE } from '../config/gameConfig';
import { getTaskColor, type TaskDefinition } from '../config/tasks';

export interface StuckTaskVisual {
  container: Phaser.GameObjects.Container;
  def: TaskDefinition;
}

export class TaskPileSystem {
  stuckTasks: StuckTaskVisual[] = [];
  pileHeight = 0;
  missCount = 0;
  silhouette: Phaser.GameObjects.Rectangle | null = null;

  constructor(
    private scene: Phaser.Scene,
    private centerX: number,
    private baseY: number
  ) {}

  addStuck(def: TaskDefinition, offsetX?: number): void {
    this.missCount++;
    const x = this.centerX + (offsetX ?? Phaser.Math.Between(-60, 60));
    const stackIndex = Math.min(this.stuckTasks.length, PILE.maxVisible - 1);
    const y = this.baseY - stackIndex * 14;

    const bg = this.scene.add.rectangle(0, 0, 36, 36, getTaskColor(def.type));
    bg.setStrokeStyle(2, 0x000000);
    const label = this.scene.add.text(0, 0, def.label, {
      fontSize: '8px',
      color: '#000',
      fontFamily: 'system-ui, sans-serif',
    });
    label.setOrigin(0.5);
    const container = this.scene.add.container(x, y, [bg, label]);
    container.setDepth(5);

    this.stuckTasks.push({ container, def });
    this.pileHeight = stackIndex + 1;

    if (this.stuckTasks.length > PILE.maxVisible) {
      const oldest = this.stuckTasks.shift();
      oldest?.container.destroy();
      this.updateSilhouette();
    }
  }

  private updateSilhouette(): void {
    if (!this.silhouette) {
      this.silhouette = this.scene.add.rectangle(
        this.centerX,
        this.baseY - 20,
        120,
        40,
        0x555555,
        0.6
      );
      this.silhouette.setDepth(4);
    }
    const extra = this.missCount - PILE.maxVisible;
    this.silhouette.setDisplaySize(120 + extra * 2, 40 + extra * 3);
    this.silhouette.setY(this.baseY - 20 - extra);
  }

  getSinkOffset(): number {
    return Math.floor(this.missCount / PILE.missInterval) * PILE.sinkPerMiss;
  }

  clear(): void {
    for (const t of this.stuckTasks) t.container.destroy();
    this.stuckTasks = [];
    this.silhouette?.destroy();
    this.silhouette = null;
    this.pileHeight = 0;
    this.missCount = 0;
  }
}
