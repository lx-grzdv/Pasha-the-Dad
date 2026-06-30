import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';

export class PashaVisual {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private leftArm: Phaser.GameObjects.Rectangle;
  private rightArm: Phaser.GameObjects.Rectangle;
  private leftLabel: Phaser.GameObjects.Text;
  private rightLabel: Phaser.GameObjects.Text;
  private bathroomIcon: Phaser.GameObjects.Text;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.baseY = y;
    this.body = scene.add.rectangle(0, 10, 50, 70, COLORS.pashaBody);
    this.head = scene.add.rectangle(0, -35, 40, 40, COLORS.pashaHead);
    this.leftArm = scene.add.rectangle(-35, 0, 20, 50, 0x7986cb);
    this.rightArm = scene.add.rectangle(35, 0, 20, 50, 0x7986cb);
    this.leftLabel = scene.add.text(-35, 0, '👶', { fontSize: '16px' }).setOrigin(0.5);
    this.rightLabel = scene.add.text(35, 0, '🧒', { fontSize: '16px' }).setOrigin(0.5);
    this.bathroomIcon = scene.add
      .text(0, -60, '🚽', { fontSize: '20px' })
      .setOrigin(0.5)
      .setVisible(false);

    this.container = scene.add.container(x, y, [
      this.body,
      this.head,
      this.leftArm,
      this.rightArm,
      this.leftLabel,
      this.rightLabel,
      this.bathroomIcon,
    ]);
    this.container.setDepth(10);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  updateVisuals(leftFree: boolean, rightFree: boolean, inBathroom: boolean): void {
    this.leftArm.setFillStyle(leftFree ? 0x39ff14 : 0x7986cb);
    this.rightArm.setFillStyle(rightFree ? 0x39ff14 : 0x7986cb);
    this.leftLabel.setVisible(!leftFree);
    this.rightLabel.setVisible(!rightFree);
    this.bathroomIcon.setVisible(inBathroom);
    this.container.setAlpha(inBathroom ? 0.5 : 1);
  }

  getCenter(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  getBaseY(): number {
    return this.baseY;
  }
}
