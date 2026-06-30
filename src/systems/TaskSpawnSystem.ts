import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { TASK_DEFINITIONS } from '../config/tasks';
import { TaskEntity } from '../entities/Task';

export class TaskSpawnSystem {
  spawnFromEdge(scene: Phaser.Scene, targetX: number, targetY: number, speed: number): TaskEntity {
    const defIndex = Phaser.Math.Between(0, TASK_DEFINITIONS.length - 1);
    const def = TASK_DEFINITIONS[defIndex];
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

    const task = new TaskEntity(scene, def, sx, sy, targetX, targetY, speed);
    return task;
  }
}
