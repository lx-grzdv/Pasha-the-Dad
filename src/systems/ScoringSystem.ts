import type { ItemDefinition } from '../config/pashaTypes';
import type { TaskDefinition } from '../config/tasks';
import { ComboSystem } from './ComboSystem';

export class ScoringSystem {
  score = 0;
  tasksDeflected = 0;
  tasksMissed = 0;
  private combo = new ComboSystem();

  reset(): void {
    this.score = 0;
    this.tasksDeflected = 0;
    this.tasksMissed = 0;
    this.combo.reset();
  }

  getComboStreak(): number {
    return this.combo.streak;
  }

  getMultiplier(): number {
    return this.combo.multiplier;
  }

  onDeflect(task: TaskDefinition, item: ItemDefinition, typeBonus: number, limbPower = 1, thrustBonus = 0): void {
    const mult = this.combo.onSuccess();
    let pts = task.points * mult * item.powerMod * limbPower;
    pts *= 1 + typeBonus + thrustBonus;
    this.score += Math.floor(pts);
    this.tasksDeflected++;
  }

  onMiss(): void {
    this.combo.onMiss();
    this.tasksMissed++;
    this.score = Math.max(0, this.score - 25);
  }

  finalize(survivalSec: number, balanceBonus: number, won: boolean): void {
    this.score += survivalSec * 10;
    this.score += balanceBonus;
    if (won) this.score += 500;
  }
}
