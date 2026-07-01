import Phaser from 'phaser';
import type { LimbKind } from '../types/game';
import { PASHA_TEXTURES, ensurePashaTextures, type PashaMood } from './pixelArt';

/**
 * Пиксельный Паша: голова с тремя состояниями лица, футболка с принтом,
 * малыш и дочка прямо в руках. Все текстуры генерируются кодом.
 */
export class PashaVisual {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private head: Phaser.GameObjects.Image;
  private leftArm: Phaser.GameObjects.Image;
  private rightArm: Phaser.GameObjects.Image;
  private leftLeg: Phaser.GameObjects.Image;
  private rightLeg: Phaser.GameObjects.Image;
  private bathroomIcon: Phaser.GameObjects.Text;
  private baseY: number;
  private swinging = false;
  private mood: PashaMood = 'ok';
  private leftFree = false;
  private rightFree = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.baseY = y;
    ensurePashaTextures(scene);

    const shadow = scene.add.ellipse(0, 58, 92, 18, 0x000000, 0.4);

    this.body = scene.add.image(0, 6, PASHA_TEXTURES.torso);
    this.head = scene.add.image(0, -34, PASHA_TEXTURES.headOk);

    this.leftArm = scene.add.image(-24, -8, PASHA_TEXTURES.armBaby).setOrigin(0.5, 0.12);
    this.rightArm = scene.add.image(24, -8, PASHA_TEXTURES.armDaughter).setOrigin(0.5, 0.12).setFlipX(true);

    this.leftLeg = scene.add.image(-10, 22, PASHA_TEXTURES.leg).setOrigin(0.5, 0.08);
    this.rightLeg = scene.add.image(10, 22, PASHA_TEXTURES.leg).setOrigin(0.5, 0.08).setFlipX(true);

    this.bathroomIcon = scene.add
      .text(0, -68, '🚽', { fontSize: '20px' })
      .setOrigin(0.5)
      .setVisible(false);

    this.container = scene.add.container(x, y, [
      shadow,
      this.leftLeg,
      this.rightLeg,
      this.body,
      this.leftArm,
      this.rightArm,
      this.head,
      this.bathroomIcon,
    ]);
    this.container.setDepth(10);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** Лицо реагирует на состояние: бодрый → мешки под глазами → почти d[e]ad */
  setMoodByEnergy(energy: number): void {
    const mood: PashaMood = energy > 55 ? 'ok' : energy > 20 ? 'tired' : 'dead';
    this.setMood(mood);
  }

  setMood(mood: PashaMood): void {
    if (this.mood === mood) return;
    this.mood = mood;
    const key =
      mood === 'ok' ? PASHA_TEXTURES.headOk : mood === 'tired' ? PASHA_TEXTURES.headTired : PASHA_TEXTURES.headDead;
    this.head.setTexture(key);
  }

  updateVisuals(leftFree: boolean, rightFree: boolean, inBathroom: boolean): void {
    if (leftFree !== this.leftFree) {
      this.leftFree = leftFree;
      this.leftArm.setTexture(leftFree ? PASHA_TEXTURES.armFree : PASHA_TEXTURES.armBaby);
    }
    if (rightFree !== this.rightFree) {
      this.rightFree = rightFree;
      this.rightArm.setTexture(rightFree ? PASHA_TEXTURES.armFree : PASHA_TEXTURES.armDaughter);
    }
    this.bathroomIcon.setVisible(inBathroom);
    this.container.setAlpha(inBathroom ? 0.55 : 1);
  }

  /** Анимация удара конкретной конечностью. aimAngle — куда бьём (радианы) */
  playLimbSwing(limb: LimbKind, scene: Phaser.Scene, aimAngle?: number): void {
    if (this.swinging) return;
    this.swinging = true;

    const reset = () => {
      this.body.setPosition(0, 6);
      this.body.setScale(1, 1);
      this.body.setAngle(0);
      this.leftLeg.setAngle(0);
      this.rightLeg.setAngle(0);
      this.leftArm.setAngle(0).setScale(1).setPosition(-24, -8);
      this.rightArm.setAngle(0).setScale(1).setPosition(24, -8);
      this.swinging = false;
    };

    /** Угол поворота руки, чтобы кулак смотрел в прицел (рука в покое висит вниз) */
    const armTarget = (fallbackDeg: number): number => {
      if (aimAngle === undefined) return fallbackDeg;
      const deg = Phaser.Math.Angle.WrapDegrees(Phaser.Math.RadToDeg(aimAngle) - 90);
      return Phaser.Math.Clamp(deg, -135, 135);
    };

    if (limb === 'leftFoot' || limb === 'rightFoot') {
      this.playGroinThrust(limb, scene, reset);
      return;
    }

    if (limb === 'head') {
      scene.tweens.add({
        targets: this.head,
        y: -46,
        angle: Phaser.Math.Between(-14, 14),
        duration: 70,
        ease: 'Quad.easeOut',
        yoyo: true,
        onComplete: () => {
          this.head.setPosition(0, -34).setAngle(0);
          reset();
        },
      });
      scene.tweens.add({
        targets: this.body,
        scaleY: 0.94,
        duration: 70,
        yoyo: true,
      });
      return;
    }

    const arm = limb === 'leftHand' ? this.leftArm : limb === 'rightHand' ? this.rightArm : null;
    if (arm) {
      // Джеб: рука выстреливает в прицел, вытягивается, корпус подаётся следом
      const target = armTarget(limb === 'leftHand' ? -70 : 70);
      scene.tweens.add({
        targets: arm,
        angle: target,
        scaleX: 1.35,
        scaleY: 1.3,
        y: -12,
        duration: 70,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: reset,
      });
      scene.tweens.add({
        targets: this.body,
        angle: target >= 0 ? 5 : -5,
        scaleY: 0.96,
        duration: 70,
        yoyo: true,
      });
      return;
    }

    if (limb === 'bothHands') {
      const target = armTarget(0);
      scene.tweens.add({
        targets: this.leftArm,
        angle: target - 20,
        scaleX: 1.35,
        scaleY: 1.3,
        y: -12,
        duration: 80,
        ease: 'Back.easeOut',
        yoyo: true,
      });
      scene.tweens.add({
        targets: this.rightArm,
        angle: target + 20,
        scaleX: 1.35,
        scaleY: 1.3,
        y: -12,
        duration: 80,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: reset,
      });
      scene.tweens.add({
        targets: this.body,
        scaleY: 0.94,
        duration: 80,
        yoyo: true,
      });
      return;
    }

    reset();
  }

  /** MJ-style pelvic thrust — пах вперёд, нога в сторону */
  private playGroinThrust(limb: LimbKind, scene: Phaser.Scene, reset: () => void): void {
    const leg = limb === 'leftFoot' ? this.leftLeg : this.rightLeg;
    const kickAngle = limb === 'leftFoot' ? -32 : 32;

    scene.tweens.add({
      targets: this.body,
      y: 14,
      scaleY: 1.1,
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

  /** Интро: Паша вбегает на позицию, семеня ногами */
  playRunIn(scene: Phaser.Scene, toX: number, duration: number, onComplete: () => void): void {
    const legL = scene.tweens.add({
      targets: this.leftLeg,
      angle: { from: -26, to: 26 },
      duration: 110,
      yoyo: true,
      repeat: -1,
    });
    const legR = scene.tweens.add({
      targets: this.rightLeg,
      angle: { from: 26, to: -26 },
      duration: 110,
      yoyo: true,
      repeat: -1,
    });
    const bob = scene.tweens.add({
      targets: [this.body, this.head],
      y: '+=3',
      duration: 110,
      yoyo: true,
      repeat: -1,
    });
    scene.tweens.add({
      targets: this.container,
      x: toX,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        legL.stop();
        legR.stop();
        bob.stop();
        this.leftLeg.setAngle(0);
        this.rightLeg.setAngle(0);
        this.body.setPosition(0, 6);
        this.head.setPosition(0, -34);
        onComplete();
      },
    });
  }

  getCenter(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  getBaseY(): number {
    return this.baseY;
  }
}
