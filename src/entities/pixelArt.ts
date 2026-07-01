import Phaser from 'phaser';

/**
 * Пиксель-арт без ассетов: карты символов превращаются в текстуры кодом.
 * Один символ = один «пиксель» размером PIXEL_SIZE.
 */

export const PIXEL_SIZE = 4;

export type PixelPalette = Record<string, number>;

/** Общая палитра персонажа */
export const PASHA_PALETTE: PixelPalette = {
  H: 0x54432e, // волосы и борода
  S: 0xf2c793, // кожа
  b: 0xc98d6b, // мешки под глазами
  E: 0x14140f, // глаза
  x: 0xff5fa2, // крестики-глаза d[e]ad
  T: 0x7dff3a, // футболка (кислота)
  D: 0x3f9c1c, // принт на футболке
  N: 0x2c3038, // шорты
  P: 0xff5fa2, // розовый: тапки, свёрток малыша
  A: 0xffd166, // янтарный: платье дочки
};

export function makePixelTexture(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  palette: PixelPalette,
  pixelSize = PIXEL_SIZE
): void {
  if (scene.textures.exists(key)) return;
  const width = Math.max(...rows.map((r) => r.length));
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (color === undefined) continue;
      g.fillStyle(color, 1);
      g.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  });
  g.generateTexture(key, width * pixelSize, rows.length * pixelSize);
  g.destroy();
}

export type PashaMood = 'ok' | 'tired' | 'dead';

const HEAD_OK = [
  '.HHHHHHHHHH.',
  'HHHHHHHHHHHH',
  'HHSSSSSSSSHH',
  'HSSSSSSSSSSH',
  'HSEESSSSEESH',
  'HSSSSSSSSSSH',
  'HSSHHHHHHSSH',
  'HHHHSSSSHHHH',
  '.HHHHHHHHHH.',
  '..HHHHHHHH..',
];

const HEAD_TIRED = [
  '.HHHHHHHHHH.',
  'HHHHHHHHHHHH',
  'HHSSSSSSSSHH',
  'HSSSSSSSSSSH',
  'HSEESSSSEESH',
  'HSbbSSSSbbSH',
  'HSSHHHHHHSSH',
  'HHHHHHHHHHHH',
  '.HHHHHHHHHH.',
  '..HHHHHHHH..',
];

const HEAD_DEAD = [
  '.HH.HHHH.HH.',
  'HHHHHHHHHHHH',
  'HHSSSSSSSSHH',
  'HSSSSSSSSSSH',
  'HSxxSSSSxxSH',
  'HSSSSSSSSSSH',
  'HSSHHHHHHSSH',
  'HHHSSSSSSHHH',
  '.HHHHHHHHHH.',
  '..HHHHHHHH..',
];

/** Торс: футболка с принтом + шорты */
const TORSO = [
  'TTTTSSTTTT',
  'TTTTTTTTTT',
  'TTTDDDDTTT',
  'TTTDDDDTTT',
  'TTTTTTTTTT',
  'TTTTTTTTTT',
  'NNNNNNNNNN',
  '.NNNNNNNN.',
];

/** Рука со свёртком-малышом (левая): розовое одеяльце, личико с глазами */
const ARM_BABY = [
  'TTTT....',
  '.SSS....',
  '.SSSS...',
  '.PPPPPP.',
  'PPSSSSPP',
  'PPSESEPP',
  'PPSSSSPP',
  '.PPPPPP.',
  '..PPPP..',
];

/** Рука с дочкой (правая, зеркалится flipX): косички, глаза, платье, ножки */
const ARM_DAUGHTER = [
  'TTTT....',
  '.SSS....',
  '.SSS....',
  '.HHHHHH.',
  'HHSSSSHH',
  '.HSESEH.',
  '..SSSS..',
  '.AAAAAA.',
  'AAAAAAAA',
  '..S..S..',
];

/** Свободная рука — кулак готов к бою */
const ARM_FREE = [
  'TTTT..',
  '.SSS..',
  '.SSS..',
  '.SSS..',
  '.SSSS.',
  '.SSSS.',
];

/** Нога с тапком */
const LEG = [
  '.SSS.',
  '.SSS.',
  '.SSS.',
  '.SSS.',
  '.SSS.',
  '.SSS.',
  'PPPPP',
  'PPPP.',
];

export const PASHA_TEXTURES = {
  headOk: 'pasha-head-ok',
  headTired: 'pasha-head-tired',
  headDead: 'pasha-head-dead',
  torso: 'pasha-torso',
  armBaby: 'pasha-arm-baby',
  armDaughter: 'pasha-arm-daughter',
  armFree: 'pasha-arm-free',
  leg: 'pasha-leg',
} as const;

export function ensurePashaTextures(scene: Phaser.Scene): void {
  makePixelTexture(scene, PASHA_TEXTURES.headOk, HEAD_OK, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.headTired, HEAD_TIRED, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.headDead, HEAD_DEAD, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.torso, TORSO, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.armBaby, ARM_BABY, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.armDaughter, ARM_DAUGHTER, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.armFree, ARM_FREE, PASHA_PALETTE);
  makePixelTexture(scene, PASHA_TEXTURES.leg, LEG, PASHA_PALETTE);
}
