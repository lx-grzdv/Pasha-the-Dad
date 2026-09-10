import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const palette = {
  wood: '#b57843',
  darkWood: '#805934',
  cream: '#ede0c4',
  wall: '#e6d6b9',
  pink: '#f37d9c',
  skin: '#f2bd8e',
  skinShade: '#e2a276',
  hair: '#3f2a1f',
  green: '#a9d84a',
  navy: '#3a3f4f',
  mustard: '#e9b64c',
  teal: '#468078',
  tealDark: '#2d5651',
  ink: '#2a2521',
  blush: '#ef9d8c',
};

/** Направление на камеру в плоскости пола: семья смотрит в кадр. */
export const FACING = 0.59;

const ROOM_W = 12;
const ROOM_D = 10;
const WALL_H = 4.6;

const textureLoader = new T.TextureLoader();

function loadRepeat(url: string, repeat: number): T.Texture {
  const tx = textureLoader.load(url);
  tx.colorSpace = T.SRGBColorSpace;
  tx.wrapS = tx.wrapT = T.RepeatWrapping;
  tx.repeat.set(repeat, repeat);
  return tx;
}

const oak = loadRepeat('/textures/oak-albedo.png', 1);
const linen = loadRepeat('/textures/linen-albedo.png', 3);

const woodColors = new Set([palette.wood, palette.darkWood, '#a87d4e', '#b3844b', '#b7864d', '#ac7a43', '#8e6b40']);
const clothColors = new Set(['#52847b', '#477b72', '#467d74', '#457970', '#5e8b75', '#edba4e', palette.mustard, '#ceb98e']);

const materialCache = new Map<string, T.MeshStandardMaterial>();

export function mat(color: string, roughness = 0.78): T.MeshStandardMaterial {
  const key = `${color}:${roughness}`;
  let m = materialCache.get(key);
  if (!m) {
    const map = woodColors.has(color) ? oak : clothColors.has(color) ? linen : null;
    m = new T.MeshStandardMaterial({ color, roughness, map });
    materialCache.set(key, m);
  }
  return m;
}

type Parent = T.Object3D;

export function box(p: Parent, x: number, y: number, z: number, w: number, h: number, d: number, color: string, r = 0.06): T.Mesh {
  const radius = Math.min(r, w / 3, h / 3, d / 3);
  const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), mat(color));
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  p.add(o);
  return o;
}

export function ball(p: Parent, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string): T.Mesh {
  const o = new T.Mesh(new T.SphereGeometry(1, 24, 18), mat(color));
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.castShadow = true;
  o.receiveShadow = true;
  p.add(o);
  return o;
}

export function cyl(p: Parent, x: number, y: number, z: number, r: number, h: number, color: string, rt = r): T.Mesh {
  const o = new T.Mesh(new T.CylinderGeometry(rt, r, h, 32), mat(color));
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  p.add(o);
  return o;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function label(p: Parent, text: string, x: number, y: number, z: number, w: number, h: number, bg: string, ink = '#263d31'): T.Mesh {
  const [c, cx] = canvas(512, 512);
  cx.fillStyle = bg;
  cx.fillRect(0, 0, 512, 512);
  cx.fillStyle = ink;
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.font = 'bold 66px sans-serif';
  const lines = text.split('\n');
  lines.forEach((s, i) => cx.fillText(s, 256, 256 + (i - (lines.length - 1) / 2) * 82, 450));
  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tx, roughness: 1 }));
  m.position.set(x, y, z);
  m.receiveShadow = true;
  p.add(m);
  return m;
}

/** Мягкое тёмное пятно на полу: контактная тень, которой не даёт shadow map. */
function blobTexture(): T.CanvasTexture {
  const [c, cx] = canvas(256, 256);
  const g = cx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(40,25,10,.55)');
  g.addColorStop(0.55, 'rgba(40,25,10,.25)');
  g.addColorStop(1, 'rgba(40,25,10,0)');
  cx.fillStyle = g;
  cx.fillRect(0, 0, 256, 256);
  return new T.CanvasTexture(c);
}

const blobTx = blobTexture();

export function blob(p: Parent, x: number, y: number, z: number, w: number, d: number, opacity = 1): T.Mesh {
  const m = new T.Mesh(
    new T.PlaneGeometry(w, d),
    new T.MeshBasicMaterial({ map: blobTx, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.renderOrder = 1;
  p.add(m);
  return m;
}

/** Затемнение у основания стены: дешёвый ambient occlusion. */
function wallShade(p: Parent, x: number, z: number, w: number, d: number, edge: 'top' | 'left'): void {
  const [c, cx] = canvas(64, 64);
  const g = edge === 'top' ? cx.createLinearGradient(0, 0, 0, 64) : cx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(50,30,10,.42)');
  g.addColorStop(1, 'rgba(50,30,10,0)');
  cx.fillStyle = g;
  cx.fillRect(0, 0, 64, 64);
  const m = new T.Mesh(
    new T.PlaneGeometry(w, d),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.006, z);
  m.renderOrder = 1;
  p.add(m);
}

/** Паркет одной плоскостью: доски, швы, волокна и подрезка по границам комнаты. */
function floorTexture(): T.CanvasTexture {
  const W = 2048;
  const H = Math.round((W * ROOM_D) / ROOM_W);
  const [c, cx] = canvas(W, H);
  const ppu = W / ROOM_W;
  const rowH = ppu * 0.5;
  const rows = Math.ceil(H / rowH);
  const tints = ['#c48f5c', '#b98352', '#cf9a66', '#c08a56', '#b47b4b', '#d2a26e'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  cx.fillStyle = '#b57e4e';
  cx.fillRect(0, 0, W, H);

  for (let row = 0; row < rows; row++) {
    const y0 = row * rowH;
    let x = -rnd() * ppu * 1.6 - (row % 2) * ppu * 0.7;
    while (x < W) {
      const len = ppu * (1.4 + rnd() * 1.1);
      const x0 = Math.max(0, x);
      const x1 = Math.min(W, x + len);
      cx.fillStyle = tints[Math.floor(rnd() * tints.length)];
      cx.fillRect(x0, y0, x1 - x0, rowH);

      // Волокна: длинные слегка волнистые штрихи вдоль доски.
      cx.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) {
        const gy = y0 + rnd() * rowH;
        const dark = rnd() > 0.5;
        cx.strokeStyle = dark ? 'rgba(70,38,14,.13)' : 'rgba(255,225,180,.12)';
        cx.beginPath();
        cx.moveTo(x0, gy);
        const wob = 2 + rnd() * 3;
        for (let gx = x0; gx <= x1; gx += 24) {
          cx.lineTo(gx, gy + Math.sin(gx * 0.02 + i) * wob);
        }
        cx.stroke();
      }
      // Фаска и шов на торце доски.
      cx.fillStyle = 'rgba(60,32,12,.45)';
      cx.fillRect(x1 - 3, y0, 3, rowH);
      cx.fillStyle = 'rgba(255,235,200,.16)';
      cx.fillRect(x0, y0 + 1, x1 - x0, 2);
      x += len;
    }
    // Шов между рядами.
    cx.fillStyle = 'rgba(60,32,12,.5)';
    cx.fillRect(0, y0 + rowH - 3, W, 3);
  }

  // Мелкий шум, чтобы доски не выглядели пластиковыми.
  for (let i = 0; i < 9000; i++) {
    cx.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)';
    cx.fillRect(rnd() * W, rnd() * H, 2, 2);
  }

  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  return tx;
}

/** Вид за окном: тёплое небо, солнце и силуэты домов. Светится сам. */
function skyTexture(): T.CanvasTexture {
  const [c, cx] = canvas(512, 352);
  const g = cx.createLinearGradient(0, 0, 0, 352);
  g.addColorStop(0, '#bfe0ee');
  g.addColorStop(0.55, '#f6e6b5');
  g.addColorStop(1, '#f5c98a');
  cx.fillStyle = g;
  cx.fillRect(0, 0, 512, 352);
  const sun = cx.createRadialGradient(360, 120, 10, 360, 120, 150);
  sun.addColorStop(0, 'rgba(255,250,220,1)');
  sun.addColorStop(0.25, 'rgba(255,240,190,.75)');
  sun.addColorStop(1, 'rgba(255,240,190,0)');
  cx.fillStyle = sun;
  cx.fillRect(0, 0, 512, 352);
  cx.fillStyle = '#e8cfa2';
  const roofs = [60, 120, 30, 150, 90, 170, 50, 110];
  roofs.forEach((h, i) => cx.fillRect(i * 64, 352 - h - 60, 66, h + 60));
  cx.fillStyle = '#d9bd8b';
  for (let i = 0; i < 40; i++) cx.fillRect(12 + (i % 8) * 64, 240 + Math.floor(i / 8) * 22, 12, 14);
  cx.fillStyle = '#a9c17a';
  for (let i = 0; i < 6; i++) {
    cx.beginPath();
    cx.arc(40 + i * 90, 300, 42, 0, Math.PI * 2);
    cx.fill();
  }
  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  return tx;
}

/** Экран Паши-дизайнера: слева макеты в духе Figma, справа страница Notion. */
function screenTexture(): T.CanvasTexture {
  const [c, cx] = canvas(1024, 640);
  // Figma: тёмный холст, два мобильных фрейма и панель слоёв.
  cx.fillStyle = '#2b2b2b';
  cx.fillRect(0, 0, 640, 640);
  cx.fillStyle = '#1e1e1e';
  cx.fillRect(0, 0, 640, 44);
  cx.fillRect(0, 44, 150, 596);
  cx.fillStyle = '#a0a0a0';
  cx.font = '600 20px ui-rounded, Arial, sans-serif';
  for (let i = 0; i < 9; i++) cx.fillRect(18, 70 + i * 34, 90 - (i % 3) * 20, 10);
  cx.fillStyle = '#c9c9c9';
  cx.fillText('Paша · Главная', 170, 30);
  const frames = [
    { x: 190, y: 90, w: 190, h: 400, accent: '#a9d84a' },
    { x: 410, y: 130, w: 190, h: 400, accent: '#f37d9c' },
  ];
  for (const f of frames) {
    cx.fillStyle = '#ffffff';
    cx.beginPath();
    cx.roundRect(f.x, f.y, f.w, f.h, 22);
    cx.fill();
    cx.fillStyle = f.accent;
    cx.beginPath();
    cx.roundRect(f.x + 16, f.y + 26, f.w - 32, 110, 14);
    cx.fill();
    cx.fillStyle = '#e8e8e8';
    for (let i = 0; i < 4; i++) {
      cx.beginPath();
      cx.roundRect(f.x + 16, f.y + 156 + i * 46, f.w - 32 - (i % 2) * 40, 26, 8);
      cx.fill();
    }
    cx.fillStyle = '#2f3a2c';
    cx.beginPath();
    cx.roundRect(f.x + 16, f.y + f.h - 60, f.w - 32, 40, 12);
    cx.fill();
    cx.strokeStyle = '#4a90e2';
    cx.lineWidth = 3;
    cx.strokeRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8);
  }
  cx.fillStyle = '#4a90e2';
  cx.font = '600 16px Arial, sans-serif';
  cx.fillText('Onboarding v8', 190, 78);
  cx.fillText('Paywall', 410, 118);
  // Notion: белая страница с заголовком и чек-листом.
  cx.fillStyle = '#ffffff';
  cx.fillRect(640, 0, 384, 640);
  cx.fillStyle = '#f7f6f3';
  cx.fillRect(640, 0, 384, 44);
  cx.fillStyle = '#37352f';
  cx.font = '700 44px Arial, sans-serif';
  cx.fillText('🏠', 668, 100);
  cx.font = '700 34px ui-rounded, Arial, sans-serif';
  cx.fillText('Дела на сегодня', 668, 160);
  const todos = ['правки v8', 'созвон 15:00', 'памперсы', 'полить цветы', 'сад: забрать', 'ужин'];
  cx.font = '500 24px Arial, sans-serif';
  todos.forEach((t, i) => {
    const y = 215 + i * 54;
    cx.strokeStyle = '#8f8e89';
    cx.lineWidth = 2.5;
    cx.strokeRect(668, y - 20, 24, 24);
    if (i < 2) {
      cx.fillStyle = '#2383e2';
      cx.fillRect(668, y - 20, 24, 24);
      cx.strokeStyle = '#ffffff';
      cx.beginPath();
      cx.moveTo(673, y - 8);
      cx.lineTo(679, y - 2);
      cx.lineTo(689, y - 16);
      cx.stroke();
    }
    cx.fillStyle = i < 2 ? '#a3a29e' : '#37352f';
    cx.fillText(t, 706, y);
    if (i < 2) cx.fillRect(706, y - 6, cx.measureText(t).width, 2);
  });
  cx.fillStyle = '#e9e9e7';
  cx.fillRect(640, 44, 3, 596);
  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  return tx;
}

/** Велосипед на стене: колёса со спицами, рама, седло и руль. */
function bicycle(p: Parent, x: number, y: number, z: number, s = 1): T.Group {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.rotation.y = Math.PI / 2;
  p.add(g);
  const frame = '#2f6f79';
  for (const wx of [-0.72, 0.72]) {
    const tyre = new T.Mesh(new T.TorusGeometry(0.52, 0.06, 10, 40), mat('#2b2b2b', 0.9));
    tyre.position.set(wx, 0, 0);
    tyre.castShadow = true;
    g.add(tyre);
    const rim = new T.Mesh(new T.TorusGeometry(0.45, 0.02, 8, 40), mat('#d9d9d9', 0.4));
    rim.position.set(wx, 0, 0);
    g.add(rim);
    for (let i = 0; i < 10; i++) {
      const spoke = cyl(g, wx, 0, 0, 0.008, 0.9, '#cfcfcf');
      spoke.rotation.z = (i * Math.PI) / 10;
    }
    cyl(g, wx, 0, 0, 0.06, 0.1, '#7a7a7a').rotation.x = Math.PI / 2;
  }
  const tube = (x1: number, y1: number, x2: number, y2: number, r = 0.035) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const t = cyl(g, (x1 + x2) / 2, (y1 + y2) / 2, 0, r, len, frame);
    t.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
    return t;
  };
  tube(-0.72, 0, -0.2, 0.55);
  tube(-0.2, 0.55, 0.45, 0.55);
  tube(0.45, 0.55, 0.72, 0);
  tube(-0.2, 0.55, 0.05, -0.05);
  tube(0.05, -0.05, 0.45, 0.55);
  tube(-0.72, 0, 0.05, -0.05);
  tube(0.05, -0.05, 0.72, 0);
  tube(-0.2, 0.55, -0.24, 0.72, 0.025);
  box(g, -0.24, 0.76, 0, 0.3, 0.07, 0.14, '#4a3626', 0.03);
  tube(0.45, 0.55, 0.52, 0.78, 0.025);
  cyl(g, 0.52, 0.8, 0, 0.022, 0.5, '#4a3626').rotation.x = Math.PI / 2;
  cyl(g, 0.05, -0.05, 0.08, 0.1, 0.04, '#7a7a7a').rotation.x = Math.PI / 2;
  cyl(g, 0.05, -0.05, 0, 0.03, 0.34, '#7a7a7a').rotation.x = Math.PI / 2;
  // Крюк над колесом.
  cyl(g, -0.72, 0.62, -0.1, 0.02, 0.24, '#8a8a8a');
  return g;
}

function plant(p: Parent, x: number, y: number, z: number, s = 1): T.Group {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  p.add(g);
  cyl(g, 0, 0.22, 0, 0.25, 0.44, '#b98547', 0.32);
  cyl(g, 0, 0.45, 0, 0.27, 0.035, '#493e28');
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const h = 0.6 + (i % 3) * 0.17;
    const leaf = ball(g, Math.cos(a) * 0.27, h, Math.sin(a) * 0.25, 0.13, 0.29, 0.055, i % 2 ? '#517239' : '#77934a');
    leaf.rotation.set(0.35 * Math.sin(a), a, Math.cos(a) * 0.55);
    cyl(g, Math.cos(a) * 0.1, h * 0.65, Math.sin(a) * 0.1, 0.017, h * 0.6, '#58703a');
  }
  return g;
}

function book(p: Parent, x: number, y: number, z: number, h: number, color: string, rot = 0): T.Group {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.rotation.z = rot;
  p.add(g);
  box(g, 0, h / 2, 0, 0.14, h, 0.36, color, 0.01);
  box(g, 0, h * 0.75, 0.19, 0.09, 0.025, 0.015, '#dbbc7e', 0.001);
  return g;
}

/**
 * Черты лица кладутся на поверхность сферы радиуса r с центром в (0, cy, 0):
 * z вычисляется из уравнения сферы, поэтому глаза не тонут и не парят.
 */
function faceFeatures(g: Parent, r: number, cy: number, o: { eye: number; spread: number; eyeY: number; smile?: boolean; brows?: boolean }): void {
  const onSphere = (x: number, y: number) => Math.sqrt(Math.max(0.01, r * r - x * x - y * y));
  const eyeZ = onSphere(o.spread, o.eyeY);
  for (const s of [-1, 1]) {
    const x = s * o.spread;
    ball(g, x, cy + o.eyeY, eyeZ - 0.01, o.eye * 1.35, o.eye * 1.6, o.eye * 0.7, '#fffaf2');
    ball(g, x - s * o.eye * 0.1, cy + o.eyeY - o.eye * 0.05, eyeZ + o.eye * 0.5, o.eye * 0.85, o.eye * 1.05, o.eye * 0.5, palette.ink);
    ball(g, x - s * o.eye * 0.35, cy + o.eyeY + o.eye * 0.35, eyeZ + o.eye * 0.9, o.eye * 0.25, o.eye * 0.25, o.eye * 0.2, '#ffffff');
    const cheekX = o.spread * 1.75;
    ball(g, s * cheekX, cy + o.eyeY - o.eye * 2.4, onSphere(cheekX, o.eyeY - o.eye * 2.4) - 0.01, o.eye * 1.2, o.eye * 0.7, o.eye * 0.35, palette.blush);
    if (o.brows) {
      const brow = box(g, x, cy + o.eyeY + o.eye * 2.1, onSphere(o.spread, o.eyeY + o.eye * 2.1) - 0.02, o.eye * 3, o.eye * 0.55, o.eye * 0.5, palette.hair, 0.02);
      brow.rotation.z = s * 0.18;
    }
  }
  ball(g, 0, cy + o.eyeY - o.eye * 1.4, onSphere(0, o.eyeY - o.eye * 1.4) + o.eye * 0.4, o.eye * 1.05, o.eye * 0.85, o.eye * 0.9, palette.skinShade);
  if (o.smile) {
    const mouth = ball(g, 0, cy + o.eyeY - o.eye * 3.1, onSphere(0, o.eyeY - o.eye * 3.1) - 0.005, o.eye * 1.3, o.eye * 0.55, o.eye * 0.3, '#b9494e');
    mouth.rotation.z = Math.PI;
  }
}

export interface Character {
  group: T.Group;
  /** Опорная высота головы для прицеливания карточек. */
  headY: number;
}

export interface Daughter extends Character {
  head: T.Group;
  rightArm: T.Group;
  dress: T.Mesh;
  phone: T.Mesh;
}

export interface Dad extends Character {
  torso: T.Group;
  head: T.Group;
  leftArm: T.Group;
  rightArm: T.Group;
  /** Ноги с шарниром в бедре: [левая, правая]. */
  legs: [T.Group, T.Group];
  baby: T.Group;
  baseY: number;
}

function buildSlipper(p: Parent, x: number): void {
  box(p, x, 0.17, 0.1, 0.5, 0.3, 0.8, palette.pink, 0.15);
  box(p, x, 0.3, -0.06, 0.44, 0.16, 0.42, '#f79bb5', 0.1);
  for (const s of [-1, 1]) {
    const ear = ball(p, x + s * 0.11, 0.46, 0.22, 0.06, 0.17, 0.05, palette.pink);
    ear.rotation.z = -s * 0.25;
    ball(p, x + s * 0.11, 0.46, 0.26, 0.03, 0.1, 0.02, '#fbd3dc');
    ball(p, x + s * 0.1, 0.27, 0.5, 0.028, 0.03, 0.02, palette.ink);
  }
  ball(p, x, 0.22, 0.52, 0.035, 0.025, 0.02, '#d9516f');
}

function buildDad(): Dad {
  const group = new T.Group();
  blob(group, 0, 0.012, 0.1, 2.4, 1.9, 0.9);

  const legs = [-0.32, 0.32].map((x) => {
    const leg = new T.Group();
    leg.position.set(x, 1.0, 0);
    group.add(leg);
    const foot = new T.Group();
    foot.position.y = -1.0;
    leg.add(foot);
    buildSlipper(foot, 0);
    cyl(leg, 0, -0.42, 0.04, 0.17, 0.5, palette.skin);
    return leg;
  }) as [T.Group, T.Group];
  box(group, 0, 0.98, 0, 1.08, 0.62, 0.7, palette.navy, 0.2);
  for (const x of [-0.31, 0.31]) box(group, x, 0.76, 0.03, 0.44, 0.18, 0.52, palette.navy, 0.12);

  const torso = new T.Group();
  torso.position.y = 1.15;
  group.add(torso);
  box(torso, 0, 0.5, 0, 1.24, 1.02, 0.8, palette.green, 0.34);
  ball(torso, 0.14, 0.52, 0.4, 0.14, 0.11, 0.03, '#7e9a35');
  ball(torso, 0.05, 0.62, 0.41, 0.07, 0.06, 0.02, '#7e9a35');
  cyl(torso, 0, 1.02, 0, 0.19, 0.22, palette.skin);
  cyl(torso, 0, 0.98, 0, 0.27, 0.08, '#8fbd3a');

  const leftArm = new T.Group();
  leftArm.position.set(-0.64, 0.88, 0.02);
  torso.add(leftArm);
  ball(leftArm, 0, 0, 0, 0.25, 0.21, 0.25, palette.green);
  ball(leftArm, -0.02, -0.28, 0.08, 0.16, 0.34, 0.16, palette.green);
  const forearmL = ball(leftArm, 0.06, -0.5, 0.38, 0.14, 0.14, 0.36, palette.skin);
  forearmL.rotation.y = -0.2;
  ball(leftArm, 0.14, -0.5, 0.7, 0.15, 0.13, 0.13, palette.skin);

  const rightArm = new T.Group();
  rightArm.position.set(0.64, 0.88, 0.02);
  torso.add(rightArm);
  ball(rightArm, 0, 0, 0, 0.25, 0.21, 0.25, palette.green);
  ball(rightArm, 0.02, -0.3, 0, 0.16, 0.36, 0.16, palette.green);
  const forearmR = ball(rightArm, 0.1, -0.66, 0.08, 0.14, 0.32, 0.14, palette.skin);
  forearmR.rotation.z = -0.15;
  ball(rightArm, 0.16, -0.95, 0.14, 0.15, 0.14, 0.14, palette.skin);

  const head = new T.Group();
  head.position.y = 1.86;
  torso.add(head);
  const r = 0.66;
  ball(head, 0, 0, 0, r, r * 0.98, r * 0.94, palette.skin);
  ball(head, 0, 0.24, -0.08, r * 1.04, r * 0.8, r * 1.0, palette.hair);
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2;
    ball(head, t * 0.42, 0.5 - Math.abs(t) * 0.07, 0.4 - Math.abs(t) * 0.12, 0.17, 0.12, 0.18, palette.hair);
  }
  for (const s of [-1, 1]) ball(head, s * r * 0.98, -0.02, 0, 0.09, 0.14, 0.08, palette.skinShade);
  const beard = ball(head, 0, -0.34, 0.2, r * 0.94, r * 0.56, r * 0.86, palette.hair);
  beard.rotation.x = 0.12;
  ball(head, 0, -0.13, 0.6, 0.24, 0.09, 0.08, palette.hair);
  ball(head, 0, -0.24, 0.65, 0.1, 0.035, 0.02, '#e29a8e');
  faceFeatures(head, r, 0, { eye: 0.075, spread: 0.24, eyeY: 0.08, brows: true });

  const baby = new T.Group();
  baby.position.set(0.12, -0.42, 0.62);
  baby.rotation.set(-0.35, 0.15, 0.55);
  leftArm.add(baby);
  buildBaby(baby);

  return { group, torso, head, leftArm, rightArm, legs, baby, headY: 3.0, baseY: 0 };
}

export function buildBaby(g: Parent): void {
  ball(g, 0, 0, 0, 0.3, 0.46, 0.28, palette.pink);
  ball(g, 0, 0.3, 0.02, 0.31, 0.3, 0.28, '#f9a6bb');
  ball(g, 0, 0.31, 0.15, 0.21, 0.2, 0.13, palette.skin);
  const r = 0.2;
  for (const s of [-1, 1]) {
    ball(g, s * 0.075, 0.35, 0.15 + Math.sqrt(r * r - 0.075 * 0.075) - 0.02, 0.028, 0.038, 0.02, palette.ink);
    ball(g, s * 0.13, 0.28, 0.15 + Math.sqrt(r * r - 0.13 * 0.13 - 0.03 * 0.03) - 0.015, 0.045, 0.028, 0.015, palette.blush);
  }
  ball(g, 0, 0.245, 0.33, 0.04, 0.03, 0.012, '#b04c4f');
  ball(g, 0, 0.3, 0.34, 0.03, 0.025, 0.02, palette.skinShade);
  const curl = ball(g, 0.02, 0.56, 0.1, 0.05, 0.035, 0.03, palette.hair);
  curl.rotation.z = 0.6;
  ball(g, 0.16, 0.02, 0.24, 0.07, 0.06, 0.05, palette.skin);
}

function buildDaughter(): Daughter {
  const group = new T.Group();
  blob(group, 0, 0.012, 0, 1.3, 1.1, 0.8);
  for (const x of [-0.13, 0.13]) {
    box(group, x, 0.07, 0.06, 0.2, 0.14, 0.34, '#b25f57', 0.06);
    cyl(group, x, 0.32, 0, 0.075, 0.42, palette.skin);
  }
  const dress = cyl(group, 0, 0.8, 0, 0.44, 0.84, palette.mustard, 0.2);
  box(group, 0, 0.42, 0, 0.9, 0.06, 0.9, '#d9a43f', 0.03);
  ball(group, -0.3, 1.1, 0, 0.11, 0.1, 0.11, palette.mustard);
  const armL = ball(group, -0.44, 1.05, -0.04, 0.16, 0.07, 0.07, palette.skin);
  armL.rotation.z = -0.15;
  ball(group, -0.58, 1.02, -0.06, 0.085, 0.08, 0.08, palette.skin);
  // Правая рука с шарниром в плече: телефон, нос, кружение.
  const rightArm = new T.Group();
  rightArm.position.set(0.3, 1.1, 0);
  group.add(rightArm);
  ball(rightArm, 0, 0, 0, 0.11, 0.1, 0.11, palette.mustard);
  ball(rightArm, 0.08, -0.24, 0.02, 0.07, 0.27, 0.07, palette.skin);
  ball(rightArm, 0.1, -0.5, 0.03, 0.085, 0.08, 0.08, palette.skin);
  const phone = box(rightArm, 0.1, -0.56, 0.12, 0.16, 0.28, 0.03, '#2b2f3a', 0.02);
  phone.rotation.x = -0.6;
  phone.visible = false;
  cyl(group, 0, 1.24, 0, 0.09, 0.12, palette.skin);

  const r = 0.42;
  const hy = 1.62;
  const head = new T.Group();
  head.position.y = hy;
  group.add(head);
  ball(head, 0, 0, 0, r, r * 1.02, r * 0.94, palette.skin);
  ball(head, 0, 0.12, -0.04, r * 1.06, r * 0.84, r * 1.02, palette.hair);
  for (let i = 0; i < 4; i++) {
    const t = (i - 1.5) / 1.5;
    ball(head, t * 0.26, 0.3 - Math.abs(t) * 0.05, 0.3 - Math.abs(t) * 0.08, 0.12, 0.1, 0.12, palette.hair);
  }
  for (const s of [-1, 1]) {
    ball(head, s * 0.45, 0.24, -0.06, 0.16, 0.17, 0.16, palette.hair);
    ball(head, s * 0.45, 0.36, 0.02, 0.075, 0.045, 0.075, palette.pink);
  }
  faceFeatures(head, r, 0, { eye: 0.06, spread: 0.15, eyeY: 0.02, smile: true });
  return { group, head, rightArm, dress, phone, headY: 2.0 };
}

export interface ClutterItem {
  group: T.Group;
  restY: number;
  /** Место на полу для пропущенной заботы. */
  home: T.Vector3;
  /** Место в завале вокруг семьи при поражении, со слоями по высоте. */
  pile: T.Vector3;
  /** 1 = только что уронили, 0 = лежит. */
  drop: number;
  spin: number;
}

const FAMILY_SPOT = new T.Vector3(0.3, 0, 0.9);

function buildClutter(p: Parent): ClutterItem[] {
  const items: ClutterItem[] = [];
  let seed = 3;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const kinds = ['block', 'sock', 'paper', 'cup', 'duck'] as const;
  for (let i = 0; i < 70; i++) {
    const g = new T.Group();
    let x = 0;
    let z = 0;
    // Подальше от семьи и стен, ближе к центру ковра и проходу.
    do {
      x = -4.2 + rnd() * 9.4;
      z = -2.2 + rnd() * 6.4;
    } while (Math.hypot(x - FAMILY_SPOT.x, z - FAMILY_SPOT.z) < 1.2);
    g.position.set(x, 0, z);
    g.rotation.y = rnd() * Math.PI * 2;
    g.visible = false;
    p.add(g);
    const kind = kinds[i % kinds.length];
    let restY = 0.15;
    if (kind === 'block') {
      box(g, 0, 0.15, 0, 0.3, 0.3, 0.3, ['#e2b945', '#669e76', '#d77c88'][i % 3], 0.05);
    } else if (kind === 'sock') {
      const s = ball(g, 0, 0.08, 0, 0.13, 0.08, 0.28, ['#f3f0e6', '#9ec7d7', '#f4c1c8'][i % 3]);
      s.rotation.y = 0.4;
      ball(g, 0.05, 0.1, 0.25, 0.12, 0.08, 0.13, ['#f3f0e6', '#9ec7d7', '#f4c1c8'][i % 3]);
      restY = 0.06;
    } else if (kind === 'paper') {
      box(g, 0, 0.012, 0, 0.5, 0.02, 0.66, '#f6f1e3', 0.004);
      for (let j = 0; j < 5; j++) box(g, -0.05 + (j % 2) * 0.05, 0.026, -0.22 + j * 0.1, 0.32 - (j % 3) * 0.06, 0.006, 0.03, '#a9b0b8', 0.001);
      restY = 0.01;
    } else if (kind === 'cup') {
      cyl(g, 0, 0.16, 0, 0.11, 0.3, '#eee3c9', 0.13);
      cyl(g, 0, 0.3, 0, 0.11, 0.02, '#5b3c2a');
      restY = 0.15;
    } else {
      ball(g, 0, 0.16, 0, 0.2, 0.16, 0.22, '#f4cf4c');
      ball(g, 0, 0.36, 0.1, 0.14, 0.14, 0.13, '#f4cf4c');
      ball(g, 0, 0.34, 0.24, 0.07, 0.04, 0.05, '#e6772d');
      ball(g, 0.06, 0.4, 0.2, 0.02, 0.02, 0.015, palette.ink);
      restY = 0.16;
    }
    const angle = rnd() * Math.PI * 2;
    const layer = Math.floor(i / 14);
    const radius = 0.25 + rnd() * (1.5 - layer * 0.18);
    const pile = new T.Vector3(FAMILY_SPOT.x + Math.cos(angle) * radius, restY + layer * 0.28, FAMILY_SPOT.z + Math.sin(angle) * radius);
    items.push({ group: g, restY, home: new T.Vector3(x, 0, z), pile, drop: 0, spin: rnd() * 2 - 1 });
  }
  // Первые пропуски ложатся далеко, последние — под ноги Паше.
  items.sort((a, b) => b.home.distanceTo(FAMILY_SPOT) - a.home.distanceTo(FAMILY_SPOT));
  return items;
}

export interface Cloud {
  group: T.Group;
  puffs: T.Mesh[];
  age: number;
}

export interface World {
  scene: T.Scene;
  cloud: Cloud;
  camera: T.OrthographicCamera;
  family: T.Group;
  dad: Dad;
  daughter: Daughter;
  cribBaby: T.Group;
  doorSign: T.MeshStandardMaterial;
  doorPosition: T.Vector3;
  clutter: ClutterItem[];
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function createWorld(renderer: T.WebGLRenderer): World {
  const scene = new T.Scene();
  scene.background = new T.Color('#173936');
  scene.fog = new T.Fog('#173936', 30, 58);

  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pmrem.dispose();

  const camera = new T.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
  camera.position.set(12, 14.5, 18);
  camera.lookAt(0.9, 1.9, 0.3);

  scene.add(new T.HemisphereLight('#fff1d2', '#5a6a5c', 1.9));

  // Ключевой свет комнаты: мягкие тени под мебелью и семьёй.
  const key = new T.DirectionalLight('#fff0d6', 2.3);
  key.position.set(-5, 13, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.normalBias = 0.04;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 5;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);

  // Солнце через окно: тёплая лужа света на полу перед Пашей.
  const sun = new T.DirectionalLight('#ffc272', 6);
  sun.position.set(2.6, 9, -11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.normalBias = 0.03;
  sun.shadow.bias = -0.0002;
  sun.shadow.radius = 3;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const fill = new T.DirectionalLight('#b9d8ec', 0.7);
  fill.position.set(9, 6, 9);
  scene.add(fill);

  const room = new T.Group();
  scene.add(room);

  // Пол: плита-основание и паркетная плоскость поверх.
  box(room, 0, -0.24, 0, ROOM_W, 0.46, ROOM_D, '#a87550', 0.04);
  const floorTx = floorTexture();
  floorTx.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = new T.Mesh(
    new T.PlaneGeometry(ROOM_W, ROOM_D),
    new T.MeshStandardMaterial({ map: floorTx, bumpMap: floorTx, bumpScale: 0.35, roughness: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  wallShade(room, 0, -ROOM_D / 2 + 0.6, ROOM_W, 1.2, 'top');
  wallShade(room, -ROOM_W / 2 + 0.6, 0, 1.2, ROOM_D, 'left');

  // Задняя стена с проёмом окна.
  const win = { x: 1.05, y: 2.95, w: 3.6, h: 2.4 };
  const wz = -ROOM_D / 2;
  box(room, (-ROOM_W / 2 + (win.x - win.w / 2)) / 2, WALL_H / 2, wz, ROOM_W / 2 + (win.x - win.w / 2), WALL_H, 0.18, palette.wall, 0.02);
  box(room, (ROOM_W / 2 + (win.x + win.w / 2)) / 2, WALL_H / 2, wz, ROOM_W / 2 - (win.x + win.w / 2), WALL_H, 0.18, palette.wall, 0.02);
  box(room, win.x, (win.y - win.h / 2) / 2, wz, win.w, win.y - win.h / 2, 0.18, palette.wall, 0.02);
  box(room, win.x, (WALL_H + win.y + win.h / 2) / 2, wz, win.w, WALL_H - (win.y + win.h / 2), 0.18, palette.wall, 0.02);
  // Рама, подоконник, переплёт. Стекло не отбрасывает тень.
  for (const s of [-1, 1]) box(room, win.x + s * (win.w / 2 + 0.08), win.y, wz + 0.02, 0.16, win.h + 0.32, 0.26, '#ac7a43', 0.03);
  box(room, win.x, win.y + win.h / 2 + 0.08, wz + 0.02, win.w + 0.32, 0.16, 0.26, '#ac7a43', 0.03);
  box(room, win.x, win.y - win.h / 2 - 0.02, wz + 0.25, win.w + 0.5, 0.14, 0.62, '#ead2a9', 0.03);
  box(room, win.x, win.y, wz + 0.06, 0.08, win.h, 0.1, '#f4dbab', 0.02);
  box(room, win.x, win.y, wz + 0.06, win.w, 0.08, 0.1, '#f4dbab', 0.02);
  const glass = new T.Mesh(
    new T.PlaneGeometry(win.w, win.h),
    new T.MeshPhysicalMaterial({ color: '#dff0f5', transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0 }),
  );
  glass.position.set(win.x, win.y, wz + 0.03);
  room.add(glass);
  const sky = new T.Mesh(new T.PlaneGeometry(5.2, 3.6), new T.MeshBasicMaterial({ map: skyTexture() }));
  sky.position.set(win.x + 0.2, win.y + 0.1, wz - 0.9);
  room.add(sky);
  plant(room, 2.3, 1.8, -4.3, 0.65);

  // Левая стена с дверью в ванную.
  const door = { z: 4.15, w: 1.2, h: 2.3 };
  const wx = -ROOM_W / 2;
  box(room, wx, WALL_H / 2, (-ROOM_D / 2 + door.z - door.w / 2) / 2, 0.18, WALL_H, ROOM_D / 2 + door.z - door.w / 2, '#dccbae', 0.02);
  box(room, wx, WALL_H / 2, (ROOM_D / 2 + door.z + door.w / 2) / 2, 0.18, WALL_H, ROOM_D / 2 - (door.z + door.w / 2), '#dccbae', 0.02);
  box(room, wx, (WALL_H + door.h) / 2, door.z, 0.18, WALL_H - door.h, door.w, '#dccbae', 0.02);
  box(room, wx + 0.05, door.h / 2, door.z, 0.1, door.h, door.w - 0.1, '#e9dcc3', 0.03);
  for (const y of [0.55, 1.45]) box(room, wx + 0.11, y, door.z, 0.03, 0.6, door.w - 0.44, '#d8c8a8', 0.01);
  for (const s of [-1, 1]) box(room, wx + 0.06, door.h / 2, door.z + s * (door.w / 2 + 0.03), 0.16, door.h + 0.1, 0.1, '#a87d4e', 0.02);
  box(room, wx + 0.06, door.h + 0.02, door.z, 0.16, 0.12, door.w + 0.2, '#a87d4e', 0.02);
  ball(room, wx + 0.16, 1.1, door.z + 0.42, 0.05, 0.05, 0.05, '#d9c26a');
  const signMesh = label(room, 'ЗАНЯТО', 0, 0, 0, 0.62, 0.24, '#c8b98f', '#5b3d33');
  signMesh.position.set(wx + 0.11, 1.9, door.z);
  signMesh.rotation.y = Math.PI / 2;
  const doorSign = signMesh.material as T.MeshStandardMaterial;
  doorSign.emissive.set('#ff6f6f');
  doorSign.emissiveIntensity = 0;
  const doorPosition = new T.Vector3(wx + 0.9, 0, door.z);

  // Плинтусы.
  box(room, wx + 0.12, 0.12, 0, 0.06, 0.24, ROOM_D, '#f3e7cf', 0.01);
  box(room, 0, 0.12, wz + 0.12, ROOM_W, 0.24, 0.06, '#f3e7cf', 0.01);

  // Диван.
  blob(room, -4.7, 0.01, -1.35, 3.2, 4.6, 0.6);
  box(room, -4.8, 0.42, -1.35, 1.75, 0.62, 3.3, '#294e4a', 0.15);
  box(room, -5.4, 1.13, -1.35, 0.42, 1.2, 3.5, '#457970', 0.15);
  for (let i = 0; i < 3; i++) {
    box(room, -4.67, 0.8, -2.4 + i * 1.05, 1.35, 0.32, 1.01, '#52847b', 0.14);
    box(room, -5.13, 1.24, -2.4 + i * 1.05, 0.42, 0.86, 0.98, '#477b72', 0.16);
  }
  for (const z of [-3.03, 0.34]) box(room, -4.71, 0.95, z, 1.7, 0.73, 0.28, '#467d74', 0.13);
  for (const z of [-2.5, -0.05]) {
    const pillow = box(room, -4.82, 1.15, z, 0.36, 0.66, 0.65, '#edba4e', 0.15);
    pillow.rotation.z = 0.15;
  }
  for (let i = 0; i < 15; i++) box(room, -4.2 + i * 0.037, 0.99, -1.22, 0.027, 0.03, 0.94, i % 2 ? '#c4af87' : '#decaa4', 0.01);

  // Стеллаж с книгами.
  blob(room, -4.2, 0.01, -4.3, 2.6, 1.6, 0.5);
  box(room, -4.2, 1.6, -4.43, 1.8, 3.2, 0.57, palette.darkWood);
  for (const x of [-5.06, -3.34]) box(room, x, 1.62, -4.28, 0.12, 3.25, 0.75, palette.wood);
  for (let j = 0; j < 5; j++) {
    box(room, -4.2, 0.17 + j * 0.68, -4.23, 1.85, 0.1, 0.78, palette.wood);
    for (let i = 0; i < 8; i++) {
      book(room, -4.91 + i * 0.2, 0.23 + j * 0.68, -4.1, 0.36 + (i % 3) * 0.08, ['#487c75', '#d5aa68', '#c57250', '#dad0a4'][i % 4], i === 7 ? -0.12 : 0);
    }
  }
  plant(room, -3.65, 3.4, -4.25, 0.8);
  label(room, '♥', -4.5, 3.65, -4.05, 0.47, 0.5, '#e4c18e');

  // Стол, монитор, клавиатура, кружка и кресло.
  blob(room, 1.2, 0.01, -3.1, 4.6, 2.4, 0.5);
  box(room, 1.22, 1.25, -3.45, 3.85, 0.18, 1.08, palette.wood);
  for (const x of [-0.5, 2.94]) for (const z of [-3.84, -3.04]) box(room, x, 0.62, z, 0.12, 1.2, 0.12, '#424842');
  box(room, 1.28, 1.91, -3.7, 1.54, 1.03, 0.11, '#343a37');
  const screen = box(room, 1.28, 1.91, -3.625, 1.39, 0.86, 0.02, '#1a292c');
  screen.material = new T.MeshBasicMaterial({ map: screenTexture(), toneMapped: false });
  box(room, 1.28, 1.37, -3.7, 0.15, 0.35, 0.13, '#40483f');
  box(room, 1.28, 1.36, -3.38, 0.55, 0.06, 0.31, '#373e37');
  box(room, 1.23, 1.37, -3.12, 0.99, 0.05, 0.29, '#333f3c');
  for (let i = 0; i < 30; i++) box(room, 0.79 + (i % 10) * 0.095, 1.403, -3.22 + Math.floor(i / 10) * 0.08, 0.071, 0.014, 0.054, '#798077', 0.006);
  cyl(room, 2.49, 1.5, -3.28, 0.13, 0.28, '#eee3c9');
  const handle = new T.Mesh(new T.TorusGeometry(0.09, 0.027, 8, 16), mat('#eee3c9'));
  handle.position.set(2.64, 1.51, -3.28);
  room.add(handle);
  cyl(room, 2.49, 1.646, -3.28, 0.105, 0.007, '#584230');
  plant(room, 2.84, 1.34, -3.6, 0.65);
  box(room, 0.01, 1.38, -3.24, 0.5, 0.07, 0.37, '#eadfc5');
  cyl(room, 1.2, 0.46, -2.33, 0.065, 0.65, '#39483e');
  box(room, 1.2, 0.8, -2.33, 0.81, 0.2, 0.75, '#5e8b75', 0.15);
  box(room, 1.2, 1.25, -1.98, 0.83, 0.86, 0.2, '#5e8b75', 0.14);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const leg = box(room, 1.2 + Math.sin(a) * 0.24, 0.17, -2.33 + Math.cos(a) * 0.24, 0.08, 0.07, 0.6, '#35463e');
    leg.rotation.y = a;
    ball(room, 1.2 + Math.sin(a) * 0.5, 0.1, -2.33 + Math.cos(a) * 0.5, 0.09, 0.09, 0.09, '#2b3834');
  }

  // Холодильник и мелочи на нём.
  blob(room, 5, 0.01, -3.4, 2.4, 2.2, 0.55);
  box(room, 5.0, 1.4, -3.61, 1.52, 2.8, 1.33, '#d5d9cb', 0.14);
  box(room, 5, 1.92, -2.91, 1.43, 1.65, 0.1, '#e1e0ce');
  box(room, 5, 0.56, -2.91, 1.43, 0.93, 0.1, '#d8dbc9');
  box(room, 4.48, 1.95, -2.81, 0.07, 0.64, 0.07, '#8e9990');
  label(room, '☺', 5.12, 2.22, -2.845, 0.42, 0.42, '#edd267');
  const note = label(room, '♥\nПАПА', 5.2, 1.55, -2.84, 0.53, 0.48, '#f1e6d4', '#c66d69');
  note.rotation.z = -0.1;
  plant(room, 5.1, 2.85, -3.6, 0.86);
  box(room, 3.66, 1.15, -4.76, 1.13, 1.83, 0.1, '#a87d4e');
  label(room, 'МАЛЕНЬКИЕ\nЛЮДИ\nБОЛЬШИЕ\nДЕЛА', 3.66, 1.15, -4.69, 1.01, 1.69, '#e9ddbd');
  box(room, 3.8, 3.22, -4.67, 1.6, 0.14, 0.48, palette.wood);
  for (let i = 0; i < 5; i++) book(room, 3.22 + i * 0.22, 3.29, -4.57, 0.45 + (i % 3) * 0.1, ['#4d7464', '#d7bd76', '#b97150'][i % 3]);

  // Картины на левой стене.
  const art = new T.Group();
  art.position.set(-5.88, 2.72, -1.35);
  art.rotation.y = Math.PI / 2;
  room.add(art);
  box(art, 0, 0, 0, 1.3, 1.75, 0.06, '#b3844b');
  label(art, 'GOOD\nDAD\nGREAT\nENOUGH', 0, 0, 0.04, 1.17, 1.6, '#f0e5c8');
  const art2 = new T.Group();
  art2.position.set(-5.88, 2.75, -3.0);
  art2.rotation.y = Math.PI / 2;
  room.add(art2);
  box(art2, 0, 0, 0, 1.1, 1.6, 0.07, '#b3844b');
  label(art2, '☀\n▲ ▲', 0, 0, 0.05, 0.98, 1.48, '#dfd9b8', '#567a63');

  // Круглый плетёный ковёр.
  cyl(room, 0, 0.05, 0.85, 2.2, 0.06, '#ceb98e');
  for (let i = 0; i < 36; i++) {
    const ring = new T.Mesh(new T.TorusGeometry(0.12 + i * 0.056, 0.026, 5, 100), mat(i % 3 ? '#ddc9a0' : '#c8b087'));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.095, 0.85);
    ring.receiveShadow = true;
    room.add(ring);
  }
  for (let i = 0; i < 100; i++) {
    const a = (i * Math.PI) / 50;
    const fringe = box(room, Math.sin(a) * 2.22, 0.07, 0.85 + Math.cos(a) * 2.22, 0.025, 0.03, 0.15, '#ddc9a0', 0.008);
    fringe.rotation.y = a;
  }

  // Кроватка малыша.
  blob(room, -4.65, 0.01, 2.65, 2.9, 2.6, 0.5);
  box(room, -4.65, 0.48, 2.65, 2.0, 0.18, 1.8, '#b7864d');
  box(room, -4.65, 0.63, 2.65, 1.82, 0.17, 1.62, '#efcfbb');
  for (let i = 0; i < 8; i++) box(room, -5.43 + i * 0.22, 0.73, 2.64, 0.09, 0.018, 1.6, '#d8a397');
  for (const x of [-5.61, -3.69]) {
    for (let j = 0; j < 8; j++) box(room, x, 0.95, 1.87 + j * 0.22, 0.065, 0.94, 0.065, '#d9b37b');
    box(room, x, 1.45, 2.65, 0.12, 0.12, 1.84, '#e0bd83');
  }
  for (const z of [1.79, 3.5]) {
    box(room, -4.65, 1.45, z, 2.05, 0.12, 0.12, '#e0bd83');
    for (let i = 0; i < 9; i++) box(room, -5.53 + i * 0.22, 0.95, z, 0.065, 0.93, 0.065, '#d9b37b');
  }
  ball(room, -4.3, 0.9, 3.1, 0.15, 0.17, 0.13, '#f3e3c6');
  ball(room, -4.36, 1.1, 3.1, 0.05, 0.16, 0.05, '#f3e3c6');
  ball(room, -4.24, 1.1, 3.1, 0.05, 0.16, 0.05, '#f3e3c6');
  const cribBaby = new T.Group();
  cribBaby.position.set(-4.8, 0.86, 2.5);
  cribBaby.rotation.set(-Math.PI / 2 + 0.35, 0, 0.3);
  cribBaby.visible = false;
  room.add(cribBaby);
  buildBaby(cribBaby);

  plant(room, -5.16, 0, 0.94, 1.2);
  bicycle(room, -5.75, 2.9, 2.6, 0.95);
  plant(room, -2.6, 0, -4.15, 1.45);

  // Мишка на диване.
  const bear = new T.Group();
  bear.position.set(-4.55, 1, -1.9);
  room.add(bear);
  ball(bear, 0, 0.15, 0, 0.18, 0.24, 0.14, '#b77c43');
  ball(bear, 0, 0.46, 0, 0.19, 0.19, 0.16, '#c48d51');
  for (const x of [-0.14, 0.14]) {
    ball(bear, x, 0.62, 0, 0.075, 0.08, 0.06, '#b77c43');
    ball(bear, x, 0.02, 0.11, 0.095, 0.07, 0.12, '#bd8449');
    ball(bear, x, 0.3, 0.01, 0.08, 0.15, 0.08, '#bd8449');
    ball(bear, x * 0.5, 0.48, 0.15, 0.018, 0.023, 0.01, '#332e23');
  }
  ball(bear, 0, 0.41, 0.17, 0.08, 0.05, 0.04, '#e0ae72');
  ball(bear, 0, 0.44, 0.2, 0.025, 0.02, 0.01, '#332e23');

  // Игрушки на полу и столик с бананами.
  for (let i = 0; i < 6; i++) {
    const b = box(room, -2.4 + (i % 3) * 0.36, 0.15, 2.6 + Math.floor(i / 3) * 0.35, 0.3, 0.3, 0.3, ['#e2b945', '#669e76', '#d77c88'][i % 3]);
    b.rotation.y = i * 0.64;
  }
  ball(room, -2.95, 0.32, 2.3, 0.32, 0.32, 0.32, '#e6bb68');
  for (let i = 0; i < 4; i++) {
    const o = ball(room, -2.95, 0.32, 2.3, 0.325, 0.325, 0.13, ['#f28b8b', '#76b7aa', '#efce6b', '#ede4c6'][i]);
    o.rotation.y = (i * Math.PI) / 4;
  }
  box(room, 4.72, 0.58, 2.6, 1.7, 0.14, 0.9, palette.wood);
  for (const x of [4.03, 5.4]) for (const z of [2.3, 2.9]) box(room, x, 0.27, z, 0.1, 0.55, 0.1, '#695f43');
  cyl(room, 4.7, 0.72, 2.6, 0.37, 0.16, '#8e6b40');
  for (let i = 0; i < 4; i++) {
    const banana = ball(room, 4.51 + i * 0.12, 0.86, 2.61, 0.065, 0.07, 0.29, '#e8bd44');
    banana.rotation.y = i * 0.28;
  }

  const clutter = buildClutter(room);

  // Семья: одна группа, повёрнутая к камере.
  const family = new T.Group();
  family.position.copy(FAMILY_SPOT);
  family.rotation.y = FACING;
  scene.add(family);
  const dad = buildDad();
  family.add(dad.group);
  const daughter = buildDaughter();
  daughter.group.position.set(1.28, 0, 0.3);
  daughter.group.rotation.y = -0.12;
  family.add(daughter.group);

  // Зелёное облако для способности «папа пукнул»: одна общая прозрачная материя.
  const cloudGroup = new T.Group();
  cloudGroup.visible = false;
  scene.add(cloudGroup);
  const puffMat = new T.MeshStandardMaterial({ color: '#a4dc4c', emissive: '#6f9a2a', emissiveIntensity: 0.5, transparent: true, opacity: 0.8, roughness: 1, depthWrite: false });
  const puffs = Array.from({ length: 6 }, () => {
    const m = new T.Mesh(new T.SphereGeometry(0.5, 16, 12), puffMat);
    cloudGroup.add(m);
    return m;
  });
  const cloud: Cloud = { group: cloudGroup, puffs, age: 0 };

  function resize(w: number, h: number): void {
    const aspect = w / h;
    const span = aspect < 1 ? 14.6 : aspect < 1.5 ? 11.8 : 10.6;
    // В портрете поднимаем центр кадра, чтобы комната не прижималась к HUD.
    const lift = aspect < 1 ? 1.1 : 0;
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2 + lift;
    camera.bottom = -span / 2 + lift;
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    scene.traverse((o) => {
      const mesh = o as T.Mesh;
      mesh.geometry?.dispose?.();
    });
    for (const m of materialCache.values()) m.dispose();
    materialCache.clear();
    floorTx.dispose();
    scene.environment?.dispose();
  }

  return { scene, camera, family, dad, daughter, cribBaby, doorSign, doorPosition, clutter, cloud, resize, dispose };
}
