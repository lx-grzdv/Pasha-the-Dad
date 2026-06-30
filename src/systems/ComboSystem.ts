import { COMBO_THRESHOLDS } from '../config/gameConfig';

export class ComboSystem {
  streak = 0;
  multiplier = 1;

  reset(): void {
    this.streak = 0;
    this.multiplier = 1;
  }

  onSuccess(): number {
    this.streak++;
    this.updateMultiplier();
    return this.multiplier;
  }

  onMiss(): void {
    this.streak = 0;
    this.multiplier = 1;
  }

  private updateMultiplier(): void {
    let m = 1;
    for (const t of COMBO_THRESHOLDS) {
      if (this.streak >= t.count) m = t.multiplier;
    }
    this.multiplier = m;
  }
}
