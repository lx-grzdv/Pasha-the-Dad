import Phaser from 'phaser';
import { TASK_DEFINITIONS, type TaskDefinition } from '../config/tasks';
import { UI } from '../ui/theme';
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

  play(centerX: number, centerY: number, flyingTasks: TaskDefinition[] = []): void {
    if (this.running) return;
    this.running = true;

    // Stick all in-flight tasks to the pile
    for (const def of flyingTasks) {
      this.pile.addStuck(def, Phaser.Math.Between(-70, 70));
    }

    const overlay = this.scene.add.rectangle(
      centerX,
      centerY,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0
    );
    overlay.setDepth(100);

    // Dense avalanche: by the time the title appears, Pasha should be visibly buried.
    for (let i = 0; i < 24; i++) {
      const def = TASK_DEFINITIONS[i % TASK_DEFINITIONS.length];
      this.scene.time.delayedCall(i * 36, () => {
        this.pile.addStuck(def, Phaser.Math.Between(-130, 130));
      });
    }

    const deadText = this.scene.add.text(centerX, centerY - 80, 'D[e]ad', {
      fontFamily: UI.font.pixel,
      fontSize: '36px',
      color: UI.colors.dangerText,
    });
    deadText.setOrigin(0.5);
    deadText.setShadow(4, 4, '#000000', 0, true, true);
    deadText.setAlpha(0);
    deadText.setDepth(101);

    const subText = this.scene.add.text(centerX, centerY - 30, 'Завалило делами', {
      fontSize: '18px',
      color: UI.colors.text,
      fontFamily: UI.font.body,
    });
    subText.setOrigin(0.5);
    subText.setAlpha(0);
    subText.setDepth(101);

    this.scene.tweens.add({
      targets: deadText,
      alpha: 1,
      duration: 400,
      delay: 760,
    });
    this.scene.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 400,
      delay: 860,
    });
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 400,
      delay: 760,
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
