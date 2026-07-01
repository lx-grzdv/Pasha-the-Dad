export interface SpawnParams {
  intervalMs: number;
  speed: number;
  burst: number;
}

/**
 * Плавная кривая сложности вместо трёх ступеней: интервал и скорость
 * непрерывно растут до 150-й секунды, финал ощутимо жарче старта.
 */
export class DifficultyRamp {
  getSpawnParams(elapsedSec: number, chaos: number): SpawnParams {
    const t = Math.min(1, elapsedSec / 150);
    let intervalMs = 2500 - 1350 * t;
    let speed = 120 + 75 * t;
    const burst = elapsedSec >= 90 ? 2 : 1;

    const chaosFactor = 1 - chaos * 0.05;
    intervalMs *= Math.max(0.5, chaosFactor);
    speed *= 1 + chaos * 0.08;

    return { intervalMs, speed, burst };
  }
}
