import Phaser from 'phaser';
import { COLORS, LIMB } from '../config/gameConfig';
import type { LimbKind } from '../types/game';

export class PashaVisual {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private leftArm: Phaser.GameObjects.Rectangle;
  private rightArm: Phaser.GameObjects.Rectangle;
  private leftLabel: Phaser.GameObjects.Text;
  private rightLabel: Phaser.GameObjects.Text;
  private bathroomIcon: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(0, 10, 50, 70, COLORS.pashaBody);
    this.head = scene.add.rectangle(0, -35, 40, 40, COLORS.pashaHead);
    this.leftArm = scene.add.rectangle(-35, 0, 20, 50, 0x7986cb);
    this.rightArm = scene.add.rectangle(35, 0, 20, 50, 0x7986cb);
    this.leftLabel = scene.add.text(-35, 0, '👶', { fontSize: '16px' }).setOrigin(0.5);
    this.rightLabel = scene.add.text(35, 0, '🧒', { fontSize: '16px' }).setOrigin(0.5);
    this.bathroomIcon = scene.add.text(0, -60, '🚽', { fontSize: '20px' }).setOrigin(0.5).setVisible(false);

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

  updateVisuals(
    leftFree: boolean,
    rightFree: boolean,
    inBathroom: boolean,
    sinkOffset: number
  ): void {
    this.container.setY(this.container.y + sinkOffset * 0); // sink applied via setPosition from outside
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
}

export class LimbHitbox {
  graphics: Phaser.GameObjects.Graphics;
  angle = 0;
  active = false;
  swingProgress = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);
  }

  setAngleFromPointer(pashaX: number, pashaY: number, pointer: Phaser.Input.Pointer, limb: LimbKind): void {
    if (limb === 'feet') {
      this.angle = Math.PI / 2 + Phaser.Math.Clamp(
        Phaser.Math.Angle.Between(pashaX, pashaY, pointer.x, pointer.y) - Math.PI / 2,
        -LIMB.feet.arc / 2,
        LIMB.feet.arc / 2
      );
    } else {
      this.angle = Phaser.Math.Angle.Between(pashaX, pashaY, pointer.x, pointer.y);
    }
  }

  draw(pashaX: number, pashaY: number, limb: LimbKind, swinging: boolean): void {
    const cfg = LIMB[limb];
    this.graphics.clear();

    const color = swinging ? 0x39ff14 : 0xffffff;
    const alpha = swinging ? 0.9 : 0.35;
    const radius = cfg.radius * (swinging ? 1.15 : 1);

    this.graphics.lineStyle(3, color, alpha);
    this.graphics.fillStyle(color, alpha * 0.3);

    const startAngle = this.angle - cfg.arc / 2;
    const endAngle = this.angle + cfg.arc / 2;

    this.graphics.beginPath();
    this.graphics.arc(pashaX, pashaY, radius, startAngle, endAngle, false);
    this.graphics.lineTo(pashaX, pashaY);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();

    if (limb === 'feet') {
      this.graphics.fillStyle(0xff6b9d, 0.5);
      this.graphics.fillCircle(
        pashaX + Math.cos(this.angle) * radius * 0.8,
        pashaY + Math.sin(this.angle) * radius * 0.8,
        12
      );
    }
  }

  getHitCircle(pashaX: number, pashaY: number, limb: LimbKind): { x: number; y: number; r: number } {
    const cfg = LIMB[limb];
    const dist = cfg.radius * 0.85;
    return {
      x: pashaX + Math.cos(this.angle) * dist,
      y: pashaY + Math.sin(this.angle) * dist,
      r: limb === 'feet' ? 28 : 38,
    };
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
