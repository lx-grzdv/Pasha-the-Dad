import { THRUST_COMBO } from '../config/gameConfig';
import type { LimbKind } from '../types/game';

type FootKind = 'leftFoot' | 'rightFoot';

export interface ThrustComboResult {
  streak: number;
  bonusMult: number;
  phrase?: string;
}

/** Комbo отбитий пахом: чередование левая/правая нога как у MJ */
export class ThrustComboSystem {
  private lastFoot: FootKind | null = null;
  streak = 0;

  reset(): void {
    this.lastFoot = null;
    this.streak = 0;
  }

  onDeflect(limb: LimbKind): ThrustComboResult {
    if (limb !== 'leftFoot' && limb !== 'rightFoot') {
      this.reset();
      return { streak: 0, bonusMult: 0 };
    }

    if (this.lastFoot && this.lastFoot !== limb) {
      this.streak++;
    } else {
      this.streak = 1;
    }
    this.lastFoot = limb;

    let bonusMult = 0;
    let phrase: string | undefined;
    if (this.streak >= THRUST_COMBO.megaAt) {
      bonusMult = THRUST_COMBO.megaMult;
      phrase = 'Bad! 🕺';
    } else if (this.streak >= THRUST_COMBO.bonusAt) {
      bonusMult = THRUST_COMBO.bonusMult;
      phrase = 'Пах-момент!';
    }

    return { streak: this.streak, bonusMult, phrase };
  }
}
