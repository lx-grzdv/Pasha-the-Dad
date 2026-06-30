import Phaser from 'phaser';
import { LIMB } from '../config/gameConfig';
import type { LimbKind } from '../types/game';

export class LimbHitbox {
  graphics: Phaser.GameObjects.Graphics;
  angle = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);
  }

  setAngleFromPointer(
    pashaX: number,
    pashaY: number,
    pointer: Phaser.Input.Pointer,
    limb: LimbKind
  ): void {
    if (limb === 'feet') {
      this.angle =
        Math.PI / 2 +
        Phaser.Math.Clamp(
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

  flashHit(pashaX: number, pashaY: number, limb: LimbKind): void {
    const hit = this.getHitCircle(pashaX, pashaY, limb);
    const flash = this.graphics.scene.add.circle(hit.x, hit.y, hit.r, 0x39ff14, 0.6);
    flash.setDepth(20);
    this.graphics.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.4,
      duration: 120,
      onComplete: () => flash.destroy(),
    });
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
