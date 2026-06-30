import type { TaskType } from '../config/tasks';
import { getMeterKeyForType } from '../config/tasks';

export interface MeterValues {
  baby: number;
  daughter: number;
  work: number;
  energy: number;
  chaos: number;
}

export class MeterSystem {
  values: MeterValues = {
    baby: 80,
    daughter: 75,
    work: 70,
    energy: 100,
    chaos: 0,
  };

  maxChaos = 0;

  reset(): void {
    this.values = { baby: 80, daughter: 75, work: 70, energy: 100, chaos: 0 };
    this.maxChaos = 0;
  }

  tick(deltaSec: number, handState: { tossBabyActive: boolean; kindergartenActive: boolean; inBathroom: boolean }): void {
    // Passive drain
    this.values.baby -= 0.8 * deltaSec;
    this.values.daughter -= 0.6 * deltaSec;
    this.values.work -= 0.5 * deltaSec;
    this.values.energy -= 0.3 * deltaSec;
    this.values.chaos += 0.02 * deltaSec;

    if (handState.tossBabyActive) {
      this.values.baby -= 2.5 * deltaSec;
    }
    if (handState.kindergartenActive) {
      this.values.daughter -= 1.2 * deltaSec;
    }
    if (handState.inBathroom) {
      this.values.work -= 2 * deltaSec;
      this.values.chaos += 0.15 * deltaSec;
    }

    this.clamp();
    this.maxChaos = Math.max(this.maxChaos, this.values.chaos);
  }

  onTaskDeflected(type: TaskType, energyCost: number): void {
    const key = getMeterKeyForType(type);
    if (key) this.values[key] = Math.min(100, this.values[key] + 5);
    this.values.energy -= energyCost;
    this.clamp();
  }

  onTaskMissed(type: TaskType, meterDamage: number, chaosOnMiss: number): void {
    const key = getMeterKeyForType(type);
    if (key) this.values[key] -= meterDamage;
    else this.values.chaos += chaosOnMiss;
    this.values.chaos += chaosOnMiss * 0.5;
    this.values.energy -= 2;
    this.clamp();
  }

  onHit(energyCost: number): void {
    this.values.energy -= energyCost * 0.3;
    this.clamp();
  }

  getCriticalFailure(): 'baby' | 'daughter' | 'work' | 'energy' | null {
    if (this.values.baby <= 0) return 'baby';
    if (this.values.daughter <= 0) return 'daughter';
    if (this.values.work <= 0) return 'work';
    if (this.values.energy <= 0) return 'energy';
    return null;
  }

  getBalanceBonus(): number {
    const min = Math.min(this.values.baby, this.values.daughter, this.values.work, this.values.energy);
    return Math.floor(min * 2);
  }

  private clamp(): void {
    const c = (v: number) => Math.max(0, Math.min(100, v));
    this.values.baby = c(this.values.baby);
    this.values.daughter = c(this.values.daughter);
    this.values.work = c(this.values.work);
    this.values.energy = c(this.values.energy);
    this.values.chaos = Math.max(0, Math.min(10, this.values.chaos));
  }
}
