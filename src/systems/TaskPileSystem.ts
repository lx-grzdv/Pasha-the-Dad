import Phaser from 'phaser';
import { PILE } from '../config/gameConfig';
import { getTaskColor, type TaskDefinition } from '../config/tasks';
import { UI } from '../ui/theme';

export interface StuckTaskVisual {
  container: Phaser.GameObjects.Container;
  def: TaskDefinition;
  layoutIndex: number;
}

const PILE_ROWS = [7, 7, 6, 6, 5, 4, 3, 2] as const;
const PILE_LAYOUT_CAPACITY = PILE_ROWS.reduce((sum, count) => sum + count, 0);

export class TaskPileSystem {
  stuckTasks: StuckTaskVisual[] = [];
  pileHeight = 0;
  missCount = 0;
  silhouette: Phaser.GameObjects.Graphics | null = null;

  constructor(
    private scene: Phaser.Scene,
    private centerX: number,
    private baseY: number
  ) {}

  addStuck(def: TaskDefinition, offsetX?: number): void {
    this.missCount++;
    if (this.stuckTasks.length >= PILE.maxVisible) {
      const oldest = this.stuckTasks.shift();
      if (oldest) {
        this.scene.tweens.killTweensOf(oldest.container);
        oldest.container.destroy();
      }
    }

    const layoutIndex = (this.missCount - 1) % Math.min(PILE.maxVisible, PILE_LAYOUT_CAPACITY);
    const slot = this.getPileSlot(layoutIndex, offsetX);

    const color = getTaskColor(def.type);
    const bg = this.scene.add.graphics();
    const cardWidth = Phaser.Math.Between(58, 74);
    const cardHeight = Phaser.Math.Between(32, 42);
    bg.fillStyle(UI.colors.bgDeep, 0.96);
    bg.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    bg.lineStyle(2, color, 0.8);
    bg.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    const label = this.scene.add.text(0, 0, def.label, {
      fontSize: '9px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontFamily: UI.font.mono,
      align: 'center',
      fixedWidth: cardWidth - 14,
      wordWrap: { width: cardWidth - 14, useAdvancedWrap: true },
    });
    label.setOrigin(0.5);

    const scale = Phaser.Math.FloatBetween(0.88, 1.06);
    const finalAngle = slot.angle;
    const container = this.scene.add.container(slot.x, slot.y - slot.drop, [bg, label]);
    container.setDepth(this.getPileDepth(slot.row, slot.slot));
    container.setAngle(finalAngle + Phaser.Math.Between(-14, 14));
    container.setScale(scale * 0.76);
    container.setAlpha(0.72);

    this.scene.tweens.add({
      targets: container,
      y: slot.y,
      alpha: 1,
      angle: finalAngle,
      scaleX: scale,
      scaleY: scale,
      duration: 190 + slot.row * 24,
      ease: 'Back.easeOut',
    });

    this.stuckTasks.push({ container, def, layoutIndex });
    this.pileHeight = Math.max(this.pileHeight, slot.row + 1);
    this.updateSilhouette();
  }

  private updateSilhouette(): void {
    if (!this.silhouette) {
      this.silhouette = this.scene.add.graphics();
      this.silhouette.setDepth(6);
    }

    const visibleCount = Math.min(this.missCount, PILE.maxVisible);
    const overflow = Math.max(0, this.missCount - PILE.maxVisible);
    const fill = visibleCount / PILE.maxVisible;
    const width = 132 + fill * 204 + Math.min(overflow * 3, 54);
    const height = 50 + fill * 206 + Math.min(overflow * 2, 46);
    const baseY = this.baseY + 38;
    const topY = baseY - height;
    const g = this.silhouette;

    g.clear();
    g.fillStyle(0x03040a, 0.52);
    g.fillEllipse(this.centerX, baseY + 10, width * 0.96, 58);
    g.fillStyle(UI.colors.panelSoft, 0.82);
    const points = [
      new Phaser.Geom.Point(this.centerX - width / 2, baseY),
      new Phaser.Geom.Point(this.centerX - width * 0.46, baseY - height * 0.2),
      new Phaser.Geom.Point(this.centerX - width * 0.29, baseY - height * 0.45),
      new Phaser.Geom.Point(this.centerX - width * 0.13, topY + height * 0.1),
      new Phaser.Geom.Point(this.centerX, topY),
      new Phaser.Geom.Point(this.centerX + width * 0.16, topY + height * 0.12),
      new Phaser.Geom.Point(this.centerX + width * 0.31, baseY - height * 0.43),
      new Phaser.Geom.Point(this.centerX + width * 0.48, baseY - height * 0.18),
      new Phaser.Geom.Point(this.centerX + width / 2, baseY),
    ];
    g.fillPoints(points, true, true);
    g.lineStyle(2, UI.colors.danger, 0.16 + fill * 0.16);
    g.strokePoints(points, true, true);
  }

  private getPileSlot(
    layoutIndex: number,
    offsetX?: number
  ): { x: number; y: number; row: number; slot: number; angle: number; drop: number } {
    let index = layoutIndex;
    let row = 0;
    for (const rowSize of PILE_ROWS) {
      if (index < rowSize) break;
      index -= rowSize;
      row++;
    }

    const rowSize = PILE_ROWS[Math.min(row, PILE_ROWS.length - 1)];
    const slot = Math.min(index, rowSize - 1);
    const middle = (rowSize - 1) / 2;
    const normalized = middle === 0 ? 0 : (slot - middle) / middle;
    const rowSpread = Math.max(72, rowSize * 36 + 32 - row * 3);
    const rowWave = row % 2 === 0 ? 0 : 11;
    const jitterX = Phaser.Math.Between(-9, 9) + (offsetX ?? 0) * 0.18;
    const jitterY = Phaser.Math.Between(-5, 7) + Math.abs(normalized) * 5;

    return {
      x: this.centerX + normalized * (rowSpread / 2) + rowWave + jitterX,
      y: this.baseY + 24 - row * 26 + jitterY,
      row,
      slot,
      angle: Phaser.Math.Between(-18, 18) + (slot % 2 === 0 ? -4 : 4),
      drop: Phaser.Math.Between(36, 72) + row * 9,
    };
  }

  private getPileDepth(row: number, slot: number): number {
    if (row <= 2) return 13 + row * 0.1 + slot * 0.01;
    if (row <= 4) return 11.5 + row * 0.1 + slot * 0.01;
    return 7 + row * 0.1 + slot * 0.01;
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
