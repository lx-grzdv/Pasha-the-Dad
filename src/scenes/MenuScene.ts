import Phaser from 'phaser';
import { ITEMS, PASHA_TYPES, type ItemId } from '../config/pashaTypes';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getSavedPlayerName, savePlayerName } from '../services/playerStorage';
import type { GameSessionConfig } from '../types/game';
import { UI, addBackdrop, addBodyText, addNeonButton, addPanel, addTag, addTitle } from '../ui/theme';

interface ItemButton {
  id: ItemId;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
}

export class MenuScene extends Phaser.Scene {
  private playerName = '';
  private selectedItem: ItemId = 'slipper';
  private nameText!: Phaser.GameObjects.Text;
  private itemButtons: ItemButton[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.playerName = getSavedPlayerName();
    this.itemButtons = [];
    const cx = GAME_WIDTH / 2;

    addBackdrop(this);

    addTitle(this, cx, 74, 'Pasha the D[e]ad', '28px');
    addTag(this, cx, 116, '180 секунд бытового bullet hell', UI.colors.pink);

    addBodyText(this, cx, 154, 'Продержись до вечера. Не дай дню тебя добить.', '16px', UI.colors.muted, 'center')
      .setOrigin(0.5);

    addPanel(this, cx, 332, 710, 302, { accent: UI.colors.mint, depth: 0 });

    addBodyText(this, 170, 222, 'Имя', '13px', UI.colors.muted).setOrigin(0, 0.5);
    addPanel(this, 314, 222, 218, 38, { accent: UI.colors.pink, fill: UI.colors.panelSoft, alpha: 0.92, radius: 8, depth: 1 });
    this.nameText = addBodyText(this, 224, 222, this.playerName || 'Паша', '15px', UI.colors.mintText)
      .setOrigin(0, 0.5)
      .setDepth(2);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.startGame();
        return;
      }
      if (e.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
      } else if (e.key.length === 1 && this.playerName.length < 16) {
        this.playerName += e.key;
      }
      this.nameText.setText(this.playerName || 'Паша');
    });

    addBodyText(this, 170, 272, 'Паша', '13px', UI.colors.muted).setOrigin(0, 0.5);
    addTag(this, 308, 272, PASHA_TYPES.balancer.name, UI.colors.amber);

    addBodyText(this, 170, 326, 'Предмет', '13px', UI.colors.muted).setOrigin(0, 0.5);
    this.createItemButton(360, 354, 'slipper');
    this.createItemButton(640, 354, 'rattle');

    addNeonButton(this, cx - 112, 478, 'START', () => this.startGame(), {
      width: 150,
      accent: UI.colors.mint,
    });
    addNeonButton(this, cx + 112, 478, 'TOP D[e]ADS', () => this.scene.start('LeaderboardScene'), {
      width: 210,
      accent: UI.colors.amber,
    });

    addBodyText(
      this,
      cx,
      GAME_HEIGHT - 42,
      'Enter — старт | Ноги / руки / башка — по высоте прицела | ЛКМ/Пробел — удар | Q/E/R — руки | P — пауза | M — звук',
      '12px',
      UI.colors.faint,
      'center'
    )
      .setOrigin(0.5);
  }

  private createItemButton(x: number, y: number, id: ItemId): void {
    const item = ITEMS[id];
    const width = 250;
    const height = 78;
    const bg = this.add.graphics();
    const title = addBodyText(this, -width / 2 + 18, -20, item.name, '15px', UI.colors.text).setDepth(2);
    const body = addBodyText(this, -width / 2 + 18, 4, item.description, '12px', UI.colors.muted).setDepth(2);
    body.setWordWrapWidth(width - 34);
    const btn = this.add.container(x, y, [bg, title, body]).setDepth(3).setSize(width, height);
    btn
      .setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        this.selectedItem = id;
        this.refreshItemButtons();
      })
      .on('pointerover', () => this.drawItemButton({ id, container: btn, bg, title, body }, true))
      .on('pointerout', () => this.drawItemButton({ id, container: btn, bg, title, body }));
    const itemButton = { id, container: btn, bg, title, body };
    this.itemButtons.push(itemButton);
    this.drawItemButton(itemButton);
  }

  private refreshItemButtons(): void {
    for (const button of this.itemButtons) this.drawItemButton(button);
  }

  private drawItemButton(button: ItemButton, hovered = false): void {
    const selected = this.selectedItem === button.id;
    const width = button.container.width;
    const height = button.container.height;
    const accent = selected ? UI.colors.mint : UI.colors.blue;
    button.bg.clear();
    if (selected) {
      button.bg.fillStyle(UI.colors.mint, 0.95);
    } else if (hovered) {
      button.bg.fillStyle(UI.colors.mint, 0.18);
    } else {
      button.bg.fillStyle(UI.colors.panelSoft, 0.85);
    }
    button.bg.fillRect(-width / 2, -height / 2, width, height);
    button.bg.lineStyle(2, accent, selected || hovered ? 1 : 0.4);
    button.bg.strokeRect(-width / 2, -height / 2, width, height);
    button.title.setColor(selected ? UI.colors.ink : UI.colors.text);
    button.body.setColor(selected ? UI.colors.ink : UI.colors.muted);
  }

  private startGame(): void {
    const name = this.playerName.trim() || 'Паша';
    savePlayerName(name);
    const config: GameSessionConfig = {
      playerName: name,
      pashaType: 'balancer',
      itemId: this.selectedItem,
    };
    this.scene.start('GameScene', config);
  }
}
