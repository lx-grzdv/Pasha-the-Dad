import Phaser from 'phaser';

const AIM_DISTANCE = 120;

/** Направление прицела: мышь или стрелки (если мыши нет / не двигалась). */
export class AimInput {
  private pointerMoved = false;
  private lastAngle = -Math.PI / 2;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  bind(scene: Phaser.Scene): void {
    this.cursors = scene.input.keyboard?.createCursorKeys() ?? null;
    scene.input.on('pointermove', () => {
      this.pointerMoved = true;
    });
  }

  getAimPoint(
    centerX: number,
    centerY: number,
    pointer: Phaser.Input.Pointer
  ): { x: number; y: number; fromKeyboard: boolean } {
    let dx = 0;
    let dy = 0;
    if (this.cursors?.up.isDown) dy -= 1;
    if (this.cursors?.down.isDown) dy += 1;
    if (this.cursors?.left.isDown) dx -= 1;
    if (this.cursors?.right.isDown) dx += 1;

    const arrowsActive = dx !== 0 || dy !== 0;
    const useKeyboard = arrowsActive || !this.pointerMoved;

    if (!useKeyboard) {
      return { x: pointer.x, y: pointer.y, fromKeyboard: false };
    }

    if (arrowsActive) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      this.lastAngle = Math.atan2(dy, dx);
    } else {
      dx = Math.cos(this.lastAngle);
      dy = Math.sin(this.lastAngle);
    }

    return {
      x: centerX + dx * AIM_DISTANCE,
      y: centerY + dy * AIM_DISTANCE,
      fromKeyboard: true,
    };
  }
}
