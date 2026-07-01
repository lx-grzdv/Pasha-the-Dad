import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { sfxClick } from '../audio/sfx';

/**
 * Кислотный пиксель-брутализм: чёрный фон, один доминантный акцент (#7dff3a),
 * плоские панели с жёсткими рамками, пиксельный шрифт на заголовках и цифрах.
 * Цвета шкал/задач (pink/amber/blue/orange) — единственные вторичные акценты.
 */
export const UI = {
  colors: {
    bg: 0x08090c,
    bgDeep: 0x050608,
    panel: 0x0d0f0c,
    panelSoft: 0x11140e,
    line: 0x272b20,
    mint: 0x7dff3a,
    lime: 0x7dff3a,
    pink: 0xff5fa2,
    amber: 0xffd166,
    blue: 0x4cc9f0,
    orange: 0xff8a4c,
    danger: 0xff3f5f,
    text: '#f4f1e6',
    muted: '#9a978a',
    faint: '#605e52',
    ink: '#08090c',
    mintText: '#7dff3a',
    limeText: '#7dff3a',
    pinkText: '#ff5fa2',
    amberText: '#ffd166',
    blueText: '#4cc9f0',
    orangeText: '#ff8a4c',
    dangerText: '#ff3f5f',
  },
  font: {
    pixel: '"Press Start 2P", monospace',
    body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"SF Mono", Menlo, Consolas, monospace',
  },
};

interface BackdropOptions {
  grid?: boolean;
  vignette?: boolean;
}

interface PanelOptions {
  accent?: number;
  fill?: number;
  alpha?: number;
  radius?: number;
  depth?: number;
}

interface ButtonOptions {
  width?: number;
  height?: number;
  accent?: number;
  fill?: number;
  textColor?: string;
  fontSize?: string;
  depth?: number;
}

export interface NeonButton {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

/** Чистый чёрный фон: bullet hell читается лучше без сетки и полос */
export function addBackdrop(scene: Phaser.Scene, options: BackdropOptions = {}): void {
  const { vignette = true } = options;
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, UI.colors.bg).setDepth(-30);

  if (vignette) {
    scene.add.rectangle(cx, 0, GAME_WIDTH, 26, UI.colors.bgDeep, 0.6).setDepth(-26).setOrigin(0.5, 0);
    scene
      .add.rectangle(cx, GAME_HEIGHT, GAME_WIDTH, 40, UI.colors.bgDeep, 0.7)
      .setDepth(-26)
      .setOrigin(0.5, 1);
  }
}

/** Плоская панель: тёмная заливка, тонкая рамка, жёсткие акцентные уголки */
export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {}
): Phaser.GameObjects.Graphics {
  const accent = options.accent ?? UI.colors.mint;
  const fill = options.fill ?? UI.colors.panel;
  const alpha = options.alpha ?? 0.88;
  const radius = options.radius ?? 4;
  const depth = options.depth ?? 0;
  const g = scene.add.graphics().setPosition(x - width / 2, y - height / 2).setDepth(depth);

  g.fillStyle(fill, alpha);
  g.fillRoundedRect(0, 0, width, height, radius);
  g.lineStyle(1, UI.colors.line, 1);
  g.strokeRoundedRect(0, 0, width, height, radius);

  const tick = 14;
  g.lineStyle(2, accent, 0.9);
  g.lineBetween(0, 0, tick, 0);
  g.lineBetween(0, 0, 0, tick);
  g.lineBetween(width - tick, height, width, height);
  g.lineBetween(width, height - tick, width, height);

  return g;
}

/** Пиксельный заголовок с жёсткой брутальной тенью вместо глоу */
export function addTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize = '26px',
  color = UI.colors.mintText
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: UI.font.pixel,
      fontSize,
      color,
      align: 'center',
    })
    .setOrigin(0.5)
    .setShadow(3, 3, '#000000', 0, true, true);
}

export function addBodyText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize = '14px',
  color = UI.colors.text,
  align: 'left' | 'center' | 'right' = 'left'
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: UI.font.body,
    fontSize,
    color,
    align,
  });
}

export function addTag(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  accent = UI.colors.mint,
  depth = 2
): Phaser.GameObjects.Container {
  const width = Math.max(94, text.length * 8 + 24);
  const bg = scene.add.graphics();
  bg.fillStyle(accent, 0.08);
  bg.fillRect(-width / 2, -13, width, 26);
  bg.lineStyle(2, accent, 0.85);
  bg.strokeRect(-width / 2, -13, width, 26);
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: UI.font.mono,
      fontSize: '12px',
      color: UI.colors.text,
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [bg, label]).setDepth(depth);
}

/** Брутальная кнопка: чёрная заливка, толстая рамка, инверсия при нажатии */
export function addNeonButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  labelText: string,
  onClick: () => void,
  options: ButtonOptions = {}
): NeonButton {
  const width = options.width ?? Math.max(130, labelText.length * 12 + 34);
  const height = options.height ?? 46;
  const accent = options.accent ?? UI.colors.mint;
  const fill = options.fill ?? UI.colors.panelSoft;
  const textColor = options.textColor ?? UI.colors.text;
  const depth = options.depth ?? 5;

  const bg = scene.add.graphics();
  const label = scene.add
    .text(0, 1, labelText, {
      fontFamily: UI.font.pixel,
      fontSize: options.fontSize ?? '12px',
      color: textColor,
      align: 'center',
    })
    .setOrigin(0.5);

  // Ховер — мгновенная инверсия всей плоскости, а не только рамки
  const draw = (hovered = false, pressed = false) => {
    bg.clear();
    bg.fillStyle(pressed || hovered ? accent : fill, pressed ? 1 : hovered ? 0.85 : 0.92);
    bg.fillRect(-width / 2, -height / 2, width, height);
    bg.lineStyle(2, accent, pressed || hovered ? 1 : 0.65);
    bg.strokeRect(-width / 2, -height / 2, width, height);
    label.setColor(pressed || hovered ? UI.colors.ink : textColor);
  };

  draw();

  const container = scene.add.container(x, y, [bg, label]).setDepth(depth).setSize(width, height);
  container
    .setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains)
    .on('pointerover', () => draw(true))
    .on('pointerout', () => draw())
    .on('pointerdown', () => {
      sfxClick();
      draw(true, true);
    })
    .on('pointerup', () => {
      draw(true);
      onClick();
    });

  return { container, label };
}
