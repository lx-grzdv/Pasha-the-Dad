import Phaser from 'phaser';
import { LIMB } from '../config/gameConfig';
import type { HandState, LimbKind } from '../types/game';

type FootKind = 'leftFoot' | 'rightFoot';

export interface ResolvedLimb {
  limb: LimbKind;
  /** Для ног — какая нога анимается (пах бьёт от groin, но нога видна) */
  footSide: FootKind | null;
  angle: number;
  anchorX: number;
  anchorY: number;
}

const FOOT_LIMBS: FootKind[] = ['leftFoot', 'rightFoot'];
const HAND_LIMBS: LimbKind[] = ['leftHand', 'rightHand'];

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

  /** Выбирает конкретную конечность по курсору и занятости рук */
  resolve(
    pashaX: number,
    pashaY: number,
    pointer: Phaser.Input.Pointer,
    handState: HandState
  ): ResolvedLimb {
    const px = pointer.x;
    const py = pointer.y;
    const pointerLeft = px < pashaX;

    const candidates: { limb: LimbKind; footSide: FootKind | null; score: number }[] = [];

    const canLeftHand = handState.leftHandFree || handState.inBathroom;
    const canRightHand = handState.rightHandFree || handState.inBathroom;
    const canBothHands = handState.inBathroom;

    if (canBothHands) {
      candidates.push({ limb: 'bothHands', footSide: null, score: this.aimScore(pashaX, pashaY, px, py, 'bothHands', -0.3) });
    }
    if (canLeftHand && !canBothHands) {
      candidates.push({ limb: 'leftHand', footSide: null, score: this.aimScore(pashaX, pashaY, px, py, 'leftHand', pointerLeft ? 0.15 : -0.2) });
    }
    if (canRightHand && !canBothHands) {
      candidates.push({ limb: 'rightHand', footSide: null, score: this.aimScore(pashaX, pashaY, px, py, 'rightHand', pointerLeft ? -0.2 : 0.15) });
    }

    const footSide: FootKind = pointerLeft ? 'leftFoot' : 'rightFoot';
    candidates.push({
      limb: footSide,
      footSide,
      score: this.aimScore(pashaX, pashaY, px, py, footSide, handState.inBathroom ? -0.05 : 0.1),
    });

    candidates.sort((a, b) => b.score - a.score);

    let pick = candidates[0];
    if (canBothHands && (pick.limb === 'leftFoot' || pick.limb === 'rightFoot')) {
      const both = candidates.find((c) => c.limb === 'bothHands');
      if (both && both.score > pick.score * 0.85 && py < pashaY + 10) pick = both;
    }
    if ((canLeftHand || canRightHand) && !canBothHands) {
      const handPick = candidates.find((c) => HAND_LIMBS.includes(c.limb));
      if (handPick && handPick.score > pick.score * 0.9 && py < pashaY + 30) pick = handPick;
    }

    const cfg = cfgFor(pick.limb);
    const anchorX = pashaX + cfg.anchorX;
    const anchorY = pashaY + cfg.anchorY;
    const angle = Phaser.Math.Angle.Between(anchorX, anchorY, px, py);

    const resolved: ResolvedLimb = {
      limb: pick.limb,
      footSide: pick.footSide,
      angle,
      anchorX,
      anchorY,
    };
    this.lastResolved = resolved;
    return resolved;
  }

  private aimScore(
    pashaX: number,
    pashaY: number,
    px: number,
    py: number,
    limb: LimbKind,
    bias: number
  ): number {
    const cfg = cfgFor(limb);
    const ax = pashaX + cfg.anchorX;
    const ay = pashaY + cfg.anchorY;
    const dist = Phaser.Math.Distance.Between(ax, ay, px, py);
    const angleToPointer = Phaser.Math.Angle.Between(ax, ay, px, py);
    const distScore = 1 / (1 + dist * 0.004);
    const angleScore = Math.cos(angleToPointer - (limb === 'leftFoot' ? Math.PI * 0.75 : limb === 'rightFoot' ? Math.PI * 0.25 : 0));
    return distScore + angleScore * 0.3 + bias;
  }

  draw(resolved: ResolvedLimb, swinging: boolean): void {
    const limb = resolved.limb;
    const cfg = cfgFor(limb);
    this.graphics.clear();

    const isFoot = FOOT_LIMBS.includes(limb as FootKind);
    const color = swinging ? 0x39ff14 : isFoot ? 0xff6b9d : 0xffffff;
    const alpha = swinging ? 0.9 : 0.35;
    const radius = cfg.radius * (swinging ? 1.15 : 1);

    this.graphics.lineStyle(3, color, alpha);
    this.graphics.fillStyle(color, alpha * 0.3);

    const startAngle = resolved.angle - cfg.arc / 2;
    const endAngle = resolved.angle + cfg.arc / 2;

    this.graphics.beginPath();
    this.graphics.arc(resolved.anchorX, resolved.anchorY, radius, startAngle, endAngle, false);
    this.graphics.lineTo(resolved.anchorX, resolved.anchorY);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();

    const hit = this.getHitCircle(resolved);
    if (isFoot) {
      this.graphics.fillStyle(0xff6b9d, swinging ? 0.75 : 0.45);
      this.graphics.fillCircle(hit.x, hit.y, hit.r * 0.55);
    }
  }

  flashHit(resolved: ResolvedLimb): void {
    const hit = this.getHitCircle(resolved);
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
