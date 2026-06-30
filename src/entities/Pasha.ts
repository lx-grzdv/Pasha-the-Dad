import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';
import type { LimbKind } from '../types/game';

export class PashaVisual {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private leftArm: Phaser.GameObjects.Rectangle;
  private rightArm: Phaser.GameObjects.Rectangle;
  private leftLeg: Phaser.GameObjects.Rectangle;
  private rightLeg: Phaser.GameObjects.Rectangle;
  private leftLabel: Phaser.GameObjects.Text;
  private rightLabel: Phaser.GameObjects.Text;
  private bathroomIcon: Phaser.GameObjects.Text;
  private baseY: number;
  private swinging = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.baseY = y;
    this.body = scene.add.rectangle(0, 10, 50, 70, COLORS.pashaBody);
    this.head = scene.add.rectangle(0, -35, 40, 40, COLORS.pashaHead);
    this.leftArm = scene.add.rectangle(-35, 0, 20, 50, 0x7986cb);
    this.rightArm = scene.add.rectangle(35, 0, 20, 50, 0x7986cb);
    this.leftLeg = scene.add.rectangle(-14, 48, 18, 36, 0x3949ab);
    this.rightLeg = scene.add.rectangle(14, 48, 18, 36, 0x3949ab);
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
      this.leftLeg,
      this.rightLeg,
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

  /** Анимация удара конкретной конечностью */
  playLimbSwing(limb: LimbKind, scene: Phaser.Scene): void {
    if (this.swinging) return;
    this.swinging = true;

    const reset = () => {
      this.body.setPosition(0, 10);
      this.body.setScale(1, 1);
      this.leftLeg.setAngle(0);
      this.rightLeg.setAngle(0);
      this.leftArm.setAngle(0);
      this.rightArm.setAngle(0);
      this.swinging = false;
    };

    if (limb === 'leftFoot' || limb === 'rightFoot') {
      this.playGroinThrust(limb, scene, reset);
      return;
    }

    const arm = limb === 'leftHand' ? this.leftArm : limb === 'rightHand' ? this.rightArm : null;
    if (arm) {
      const dir = limb === 'leftHand' ? -35 : 35;
      scene.tweens.add({
        targets: arm,
        angle: dir,
        duration: 80,
        yoyo: true,
        onComplete: reset,
      });
      return;
    }

    if (limb === 'bothHands') {
      scene.tweens.add({ targets: this.leftArm, angle: -40, duration: 90, yoyo: true });
      scene.tweens.add({
        targets: this.rightArm,
        angle: 40,
        duration: 90,
        yoyo: true,
        onComplete: reset,
      });
      return;
    }

    reset();
  }

  /** MJ-style pelvic thrust — пах вперёд, нога в сторону */
  private playGroinThrust(limb: LimbKind, scene: Phaser.Scene, reset: () => void): void {
    const leg = limb === 'leftFoot' ? this.leftLeg : this.rightLeg;
    const kickAngle = limb === 'leftFoot' ? -28 : 28;

    scene.tweens.add({
      targets: this.body,
      y: 18,
      scaleY: 1.08,
      duration: 70,
      ease: 'Quad.easeOut',
      yoyo: true,
    });

    scene.tweens.add({
      targets: leg,
      angle: kickAngle,
      duration: 90,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: reset,
    });
  }

  getCenter(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  getBaseY(): number {
    return this.baseY;
  }
}
