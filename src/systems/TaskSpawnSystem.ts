import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { TASK_DEFINITIONS, type TaskType } from '../config/tasks';
import { TaskEntity } from '../entities/Task';
import type { MeterValues } from './MeterSystem';

/**
 * Спавн с «директором»: чем ниже шкала — тем чаще прилетают задачи её типа,
 * чтобы игрок всегда мог восстановить просевшую шкалу отбиванием.
 * Без этого проигрыш случался из-за чистого RNG.
 */
export class TaskSpawnSystem {
  spawnFromEdge(
    scene: Phaser.Scene,
    targetX: number,
    targetY: number,
    speed: number,
    meters?: MeterValues,
    targetJitter = 0
  ): TaskEntity {
    const def = this.pickDefinition(meters);
    return this.spawnDef(scene, def, targetX, targetY, speed, targetJitter);
  }

  /** Спавн задачи конкретного типа — для именованных волн */
  spawnType(
    scene: Phaser.Scene,
    type: TaskType,
    targetX: number,
    targetY: number,
    speed: number,
    targetJitter = 0
  ): TaskEntity {
    const pool = TASK_DEFINITIONS.filter((d) => d.type === type);
    const def = pool[Phaser.Math.Between(0, pool.length - 1)];
    return this.spawnDef(scene, def, targetX, targetY, speed, targetJitter);
  }

  private pickDefinition(meters?: MeterValues) {
    if (!meters) {
      return TASK_DEFINITIONS[Phaser.Math.Between(0, TASK_DEFINITIONS.length - 1)];
    }

    const typeWeight = (type: TaskType): number => {
      if (type === 'chaos') return 0.9;
      const value = meters[type];
      return 1 + Math.max(0, 75 - value) / 22;
    };

    const weights = TASK_DEFINITIONS.map((d) => typeWeight(d.type));
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < TASK_DEFINITIONS.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return TASK_DEFINITIONS[i];
    }
    return TASK_DEFINITIONS[TASK_DEFINITIONS.length - 1];
  }

  private spawnDef(
    scene: Phaser.Scene,
    def: (typeof TASK_DEFINITIONS)[number],
    targetX: number,
    targetY: number,
    speed: number,
    targetJitter: number
  ): TaskEntity {
    const edge = Phaser.Math.Between(0, 3);
    const margin = 30;
    let sx: number;
    let sy: number;

    if (edge === 0) {
      sx = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      sy = -margin;
    } else if (edge === 1) {
      sx = GAME_WIDTH + margin;
      sy = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
    } else if (edge === 2) {
      sx = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      sy = GAME_HEIGHT + margin;
    } else {
      sx = -margin;
      sy = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
    }

    const jitter = targetJitter > 0 ? Phaser.Math.Between(-targetJitter, targetJitter) : 0;
    return new TaskEntity(scene, def, sx, sy, targetX + jitter, targetY + jitter * 0.6, speed);
  }
}
