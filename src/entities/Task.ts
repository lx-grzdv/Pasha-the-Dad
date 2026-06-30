import Phaser from 'phaser';
import { getTaskColor, type TaskDefinition } from '../config/tasks';

export type TaskState = 'flying' | 'deflected' | 'missed' | 'stuck';

export class TaskEntity {
  container: Phaser.GameObjects.Container;
  state: TaskState = 'flying';
  readonly def: TaskDefinition;
  private velocity: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    def: TaskDefinition,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    speed: number
  ) {
    this.def = def;
    const bg = scene.add.rectangle(0, 0, 40, 40, getTaskColor(def.type));
    bg.setStrokeStyle(2, 0x000000);
    const label = scene.add.text(0, 0, def.label, {
      fontSize: '9px',
      color: '#000',
      fontFamily: 'system-ui, sans-serif',
    });
    label.setOrigin(0.5);

    this.container = scene.add.container(startX, startY, [bg, label]);
    this.container.setDepth(8);

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    this.velocity = new Phaser.Math.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  update(deltaSec: number, targetX: number, targetY: number): boolean {
    if (this.state !== 'flying') return false;

    this.container.x += this.velocity.x * deltaSec;
    this.container.y += this.velocity.y * deltaSec;

    const dist = Phaser.Math.Distance.Between(
      this.container.x,
      this.container.y,
      targetX,
      targetY
    );
    return dist < 35;
  }

  deflect(scene: Phaser.Scene): void {
    this.state = 'deflected';
    scene.tweens.add({
      targets: this.container,
      x: this.container.x + this.velocity.x * 2,
      y: this.container.y + this.velocity.y * 2 - 80,
      alpha: 0,
      scale: 0.3,
      duration: 300,
      onComplete: () => this.container.destroy(),
    });
  }

  markMissed(): void {
    this.state = 'missed';
  }

  getBounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.container.x, this.container.y, 22);
  }

  destroy(): void {
    this.container.destroy();
  }
}
