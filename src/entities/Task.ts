import Phaser from 'phaser';
import { getTaskColor, type TaskDefinition } from '../config/tasks';
import { UI } from '../ui/theme';

export type TaskState = 'flying' | 'deflected' | 'missed' | 'stuck';

/**
 * Летящая задача-стикер: чёрная карточка с толстой цветной рамкой.
 * Жирные задачи (hp 2) крупнее и с двойной рамкой; зигзаг-задачи виляют.
 */
export class TaskEntity {
  container: Phaser.GameObjects.Container;
  state: TaskState = 'flying';
  readonly def: TaskDefinition;
  hp: number;
  private velocity: Phaser.Math.Vector2;
  private elapsed = 0;
  private lastPerp = 0;

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
    this.hp = def.hp ?? 1;
    const color = getTaskColor(def.type);
    const heavy = this.hp > 1;
    const w = heavy ? 88 : 76;
    const h = heavy ? 48 : 42;

    const bg = scene.add.graphics();
    bg.fillStyle(UI.colors.bgDeep, 0.94);
    bg.fillRect(-w / 2, -h / 2, w, h);
    bg.lineStyle(heavy ? 3 : 2, color, 0.95);
    bg.strokeRect(-w / 2, -h / 2, w, h);
    if (heavy) {
      bg.lineStyle(1, color, 0.5);
      bg.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    }

    const label = scene.add.text(0, 0, def.label, {
      fontSize: '11px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontFamily: UI.font.mono,
      align: 'center',
      fixedWidth: w - 14,
      wordWrap: { width: w - 14, useAdvancedWrap: true },
    });
    label.setOrigin(0.5);

    this.container = scene.add.container(startX, startY, [bg, label]);
    this.container.setDepth(8);
    this.container.setAngle(Phaser.Math.Between(-7, 7));

    const effSpeed = speed * (def.speedMod ?? 1);
    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    this.velocity = new Phaser.Math.Vector2(Math.cos(angle) * effSpeed, Math.sin(angle) * effSpeed);
  }

  update(deltaSec: number, targetX: number, targetY: number): boolean {
    if (this.state !== 'flying') return false;

    this.elapsed += deltaSec;
    this.container.x += this.velocity.x * deltaSec;
    this.container.y += this.velocity.y * deltaSec;

    if (this.def.movement === 'zigzag') {
      const perp = Math.sin(this.elapsed * 6) * 30;
      const len = this.velocity.length() || 1;
      const nx = -this.velocity.y / len;
      const ny = this.velocity.x / len;
      this.container.x += nx * (perp - this.lastPerp);
      this.container.y += ny * (perp - this.lastPerp);
      this.lastPerp = perp;
    }

    const dist = Phaser.Math.Distance.Between(
      this.container.x,
      this.container.y,
      targetX,
      targetY
    );
    return dist < 35;
  }

  /** Удар по задаче. Возвращает true, если задача добита */
  hit(scene: Phaser.Scene): boolean {
    this.hp--;
    if (this.hp > 0) {
      const knockback = 46;
      const len = this.velocity.length() || 1;
      this.container.x -= (this.velocity.x / len) * knockback;
      this.container.y -= (this.velocity.y / len) * knockback;
      scene.tweens.add({
        targets: this.container,
        scaleX: 1.18,
        scaleY: 0.85,
        angle: this.container.angle + Phaser.Math.Between(-10, 10),
        duration: 70,
        yoyo: true,
      });
      return false;
    }
    this.deflect(scene);
    return true;
  }

  deflect(scene: Phaser.Scene): void {
    this.state = 'deflected';
    scene.tweens.add({
      targets: this.container,
      scaleX: 1.3,
      scaleY: 0.7,
      duration: 50,
      yoyo: true,
    });
    scene.tweens.add({
      targets: this.container,
      x: this.container.x + this.velocity.x * 2,
      y: this.container.y + this.velocity.y * 2 - 80,
      alpha: 0,
      scale: 0.3,
      angle: this.container.angle + Phaser.Math.Between(-40, 40),
      duration: 300,
      delay: 50,
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
