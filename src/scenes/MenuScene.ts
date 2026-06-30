import Phaser from 'phaser';
import { ITEMS, PASHA_TYPES, type ItemId } from '../config/pashaTypes';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getSavedPlayerName, savePlayerName } from '../services/playerStorage';
import type { GameSessionConfig } from '../types/game';

export class MenuScene extends Phaser.Scene {
  private playerName = '';
  private selectedItem: ItemId = 'slipper';
  private nameText!: Phaser.GameObjects.Text;
  private itemButtons: { id: ItemId; text: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.playerName = getSavedPlayerName();
    this.itemButtons = [];
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a);

    this.add
      .text(cx, 80, 'Pasha the D[e]ad', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '28px',
        color: '#39ff14',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 130, 'Продержись 180 секунд.\nНе дай дню тебя добить.', {
        fontSize: '16px',
        color: '#aaa',
        align: 'center',
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5);

    this.add.text(120, 200, 'Имя:', { fontSize: '14px', color: '#fff' });
    this.nameText = this.add.text(180, 200, this.playerName || 'Паша', {
      fontSize: '14px',
      color: '#39ff14',
      backgroundColor: '#222',
      padding: { x: 8, y: 4 },
    });

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
      } else if (e.key.length === 1 && this.playerName.length < 16) {
        this.playerName += e.key;
      }
      this.nameText.setText(this.playerName || 'Паша');
    });

    this.add.text(120, 250, 'Паша:', { fontSize: '14px', color: '#fff' });
    this.add.text(180, 250, PASHA_TYPES.balancer.name, { fontSize: '14px', color: '#ffd93d' });

    this.add.text(120, 290, 'Предмет:', { fontSize: '14px', color: '#fff' });
    this.createItemButton(180, 320, 'slipper');
    this.createItemButton(340, 320, 'rattle');

    this.createButton(cx - 110, 420, 'START', () => this.startGame());
    this.createButton(cx + 110, 420, 'TOP D[e]ADS', () => this.scene.start('LeaderboardScene'));

    this.add
      .text(cx, GAME_HEIGHT - 40, 'Мышь/стрелки — направление | ЛКМ/Пробел — удар | Q/E/R — освободить руки', {
        fontSize: '11px',
        color: '#666',
        fontFamily: 'system-ui, sans-serif',
      })
      .setOrigin(0.5);
  }

  private createItemButton(x: number, y: number, id: ItemId): void {
    const item = ITEMS[id];
    const selected = this.selectedItem === id;
    const btn = this.add
      .text(x, y, `${item.name}\n${item.description}`, {
        fontSize: '11px',
        color: selected ? '#000' : '#fff',
        backgroundColor: selected ? '#39ff14' : '#333',
        padding: { x: 10, y: 8 },
        fontFamily: 'system-ui, sans-serif',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.selectedItem = id;
        this.refreshItemButtons();
      });
    this.itemButtons.push({ id, text: btn });
  }

  private refreshItemButtons(): void {
    for (const { id, text } of this.itemButtons) {
      const selected = this.selectedItem === id;
      text.setColor(selected ? '#000' : '#fff');
      text.setBackgroundColor(selected ? '#39ff14' : '#333');
    }
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    this.add
      .text(x, y, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#000',
        backgroundColor: '#39ff14',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
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
