import Phaser from 'phaser';
import { TASK_DEFINITIONS } from '../config/tasks';
import type { TaskPileSystem } from './TaskPileSystem';

export class DefeatSequence {
  private running = false;

  constructor(
    private scene: Phaser.Scene,
    private pile: TaskPileSystem,
    private onComplete: () => void
  ) {}

  isRunning(): boolean {
    return this.running;
  }

  play(centerX: number, centerY: number): void {
    if (this.running) return;
    this.running = true;

    const overlay = this.scene.add.rectangle(
      centerX,
      centerY,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0
    );
    overlay.setDepth(100);

    // Avalanche ghost tasks
    for (let i = 0; i < 8; i++) {
      const def = TASK_DEFINITIONS[i % TASK_DEFINITIONS.length];
      this.scene.time.delayedCall(i * 80, () => {
        this.pile.addStuck(def, Phaser.Math.Between(-80, 80));
      });
    }

    const deadText = this.scene.add.text(centerX, centerY - 80, 'D[e]ad', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '36px',
      color: '#39ff14',
    });
    deadText.setOrigin(0.5);
    deadText.setAlpha(0);
    deadText.setDepth(101);

    const subText = this.scene.add.text(centerX, centerY - 30, 'Завалило делами', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    });
    subText.setOrigin(0.5);
    subText.setAlpha(0);
    subText.setDepth(101);

    this.scene.tweens.add({
      targets: deadText,
      alpha: 1,
      duration: 400,
      delay: 600,
    });
    this.scene.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 400,
      delay: 700,
    });
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 400,
      delay: 600,
    });

    this.scene.time.delayedCall(2000, () => {
      overlay.destroy();
      deadText.destroy();
      subText.destroy();
      this.running = false;
      this.onComplete();
    });
  }
}
