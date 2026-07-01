import Phaser from 'phaser';
import { LIMB } from '../config/gameConfig';
import type { HandState, LimbKind } from '../types/game';

type FootKind = 'leftFoot' | 'rightFoot';

export interface ResolvedLimb {
  limb: LimbKind;
  /** Для ног — какая нога анимируется (пах бьёт от groin, но нога видна) */
  footSide: FootKind | null;
  angle: number;
  anchorX: number;
  anchorY: number;
}

const FOOT_LIMBS: FootKind[] = ['leftFoot', 'rightFoot'];

function cfgFor(limb: LimbKind) {
  if (limb === 'leftFoot' || limb === 'rightFoot') return LIMB.groin;
  return LIMB[limb];
}

export class LimbHitbox {
  graphics: Phaser.GameObjects.Graphics;
  lastResolved: ResolvedLimb | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);
  }

  /**
   * Детерминированный выбор конечности — правило объясняется одной фразой:
   * прицел выше пояса — руки (если свободны), ниже пояса — ноги. Сторона — по прицелу.
   */
  resolve(
    pashaX: number,
    pashaY: number,
    aimX: number,
    aimY: number,
    handState: HandState
  ): ResolvedLimb {
    const pointerLeft = aimX < pashaX;
    const beltY = pashaY + 14;
    const headY = pashaY - 58;
    const footSide: FootKind = pointerLeft ? 'leftFoot' : 'rightFoot';

    let limb: LimbKind = footSide;
    if (aimY < headY) {
      // Совсем вверх — хэдбатт, работает даже с занятыми руками
      limb = 'head';
    } else if (aimY < beltY) {
      if (handState.inBathroom) {
        limb = 'bothHands';
      } else if (pointerLeft && handState.leftHandFree) {
        limb = 'leftHand';
      } else if (!pointerLeft && handState.rightHandFree) {
        limb = 'rightHand';
      } else if (handState.leftHandFree) {
        limb = 'leftHand';
      } else if (handState.rightHandFree) {
        limb = 'rightHand';
      }
    }

    const cfg = cfgFor(limb);
    const anchorX = pashaX + cfg.anchorX;
    const anchorY = pashaY + cfg.anchorY;
    const angle = Phaser.Math.Angle.Between(anchorX, anchorY, aimX, aimY);

    const resolved: ResolvedLimb = {
      limb,
      footSide: limb === footSide ? footSide : null,
      angle,
      anchorX,
      anchorY,
    };
    this.lastResolved = resolved;
    return resolved;
  }

  /** В покое — тонкий ретикл в точке удара; арка появляется только в момент свинга */
  draw(resolved: ResolvedLimb, swinging: boolean): void {
    const limb = resolved.limb;
    const cfg = cfgFor(limb);
    this.graphics.clear();

    const isFoot = FOOT_LIMBS.includes(limb as FootKind);
    const color = swinging ? 0x7dff3a : limb === 'head' ? 0xffd166 : isFoot ? 0xff5fa2 : 0x4cc9f0;
    const hit = this.getHitCircle(resolved);

    if (!swinging) {
      this.graphics.lineStyle(2, color, 0.55);
      this.graphics.strokeCircle(hit.x, hit.y, 9);
      const cross = 5;
      this.graphics.lineBetween(hit.x - 9 - cross, hit.y, hit.x - 9 + 2, hit.y);
      this.graphics.lineBetween(hit.x + 9 - 2, hit.y, hit.x + 9 + cross, hit.y);
      this.graphics.lineBetween(hit.x, hit.y - 9 - cross, hit.x, hit.y - 9 + 2);
      this.graphics.lineBetween(hit.x, hit.y + 9 - 2, hit.x, hit.y + 9 + cross);
      this.graphics.fillStyle(color, 0.5);
      this.graphics.fillCircle(hit.x, hit.y, 2);
      return;
    }

    const radius = cfg.radius * 1.15;
    this.graphics.lineStyle(3, color, 0.9);
    this.graphics.fillStyle(color, 0.26);

    const startAngle = resolved.angle - cfg.arc / 2;
    const endAngle = resolved.angle + cfg.arc / 2;

    this.graphics.beginPath();
    this.graphics.arc(resolved.anchorX, resolved.anchorY, radius, startAngle, endAngle, false);
    this.graphics.lineTo(resolved.anchorX, resolved.anchorY);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();
  }

  flashHit(resolved: ResolvedLimb): void {
    const hit = this.getHitCircle(resolved);
    const flash = this.graphics.scene.add.circle(hit.x, hit.y, hit.r, 0x7dff3a, 0.6);
    flash.setDepth(20);
    this.graphics.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.4,
      duration: 120,
      onComplete: () => flash.destroy(),
    });
  }

  getHitCircle(resolved: ResolvedLimb): { x: number; y: number; r: number } {
    const cfg = cfgFor(resolved.limb);
    const dist = cfg.radius * 0.85;
    return {
      x: resolved.anchorX + Math.cos(resolved.angle) * dist,
      y: resolved.anchorY + Math.sin(resolved.angle) * dist,
      r: cfg.hitR,
    };
  }

  getPowerMod(limb: LimbKind): number {
    return cfgFor(limb).power;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
