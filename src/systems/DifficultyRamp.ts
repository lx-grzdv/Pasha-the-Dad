export interface SpawnParams {
  intervalMs: number;
  speed: number;
  burst: number;
}

export class DifficultyRamp {
  getSpawnParams(elapsedSec: number, chaos: number): SpawnParams {
    let intervalMs = 2500;
    let speed = 120;
    let burst = 1;

    if (elapsedSec >= 30) {
      intervalMs = 2000;
      speed = 140;
    }
    if (elapsedSec >= 90) {
      intervalMs = 1500;
      speed = 170;
      burst = 2;
    }

    const chaosFactor = 1 - chaos * 0.05;
    intervalMs *= Math.max(0.5, chaosFactor);
    speed *= 1 + chaos * 0.08;

    return { intervalMs, speed, burst };
  }
}
