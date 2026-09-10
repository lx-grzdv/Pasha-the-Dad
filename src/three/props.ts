import * as T from 'three';
import { ball, box, cyl, mat, palette } from './world';

/**
 * Летящие заботы как настоящие предметы: по одной чанки-модели на каждую
 * задачу из конфигурации. Все модели вписаны примерно в кубик 1.3 единицы
 * с центром в начале координат, чтобы их можно было менять местами.
 */

type Builder = (g: T.Group) => void;

function star(g: T.Group, x: number, y: number, z: number, r: number, color: string, depth = 0.12): T.Mesh {
  const shape = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.closePath();
  const m = new T.Mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), mat(color, 0.5));
  m.position.set(x, y, z - depth / 2);
  m.castShadow = true;
  g.add(m);
  return m;
}

function arc(g: T.Group, r: number, tube: number, from: number, to: number, color: string): T.Mesh {
  const m = new T.Mesh(new T.TorusGeometry(r, tube, 10, 32, to - from), mat(color, 0.6));
  m.rotation.z = from;
  m.castShadow = true;
  g.add(m);
  return m;
}

function textPlane(g: T.Group, text: string, x: number, y: number, z: number, size: number, color: string, ink: string): T.Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const cx = c.getContext('2d')!;
  cx.fillStyle = color;
  cx.fillRect(0, 0, 256, 256);
  cx.fillStyle = ink;
  cx.font = '900 190px ui-rounded, Arial, sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, 128, 140);
  const tx = new T.CanvasTexture(c);
  tx.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshStandardMaterial({ map: tx, roughness: 0.7 }));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

const builders: Record<string, Builder> = {
  // ---- малыш ----
  cry(g) {
    ball(g, 0, 0, 0, 0.55, 0.52, 0.5, palette.skin);
    ball(g, 0, 0.32, -0.05, 0.45, 0.28, 0.42, '#f79bb3');
    for (const s of [-1, 1]) {
      const eye = box(g, s * 0.2, 0.1, 0.46, 0.18, 0.05, 0.04, palette.ink, 0.02);
      eye.rotation.z = -s * 0.5;
      ball(g, s * 0.24, -0.12, 0.44, 0.06, 0.16, 0.04, '#8fd3ff');
      ball(g, s * 0.34, -0.28, 0.34, 0.05, 0.12, 0.04, '#8fd3ff');
    }
    ball(g, 0, -0.18, 0.47, 0.17, 0.14, 0.06, '#8c2f38');
    ball(g, 0, -0.24, 0.51, 0.1, 0.06, 0.04, '#f36f86');
  },
  bottle(g) {
    cyl(g, 0, -0.15, 0, 0.26, 0.8, '#eef6ff', 0.24);
    for (let i = 0; i < 4; i++) box(g, 0.2, -0.45 + i * 0.2, 0.15, 0.08, 0.02, 0.02, '#8ab4d6', 0.005);
    cyl(g, 0, 0.32, 0, 0.27, 0.16, palette.pink, 0.27);
    cyl(g, 0, 0.44, 0, 0.14, 0.12, '#f4c9a0', 0.1);
    ball(g, 0, 0.55, 0, 0.1, 0.12, 0.1, '#f4c9a0');
    cyl(g, 0, -0.1, 0, 0.2, 0.5, '#fff9f0', 0.2).position.z = 0.02;
  },
  diaper(g) {
    box(g, 0, -0.2, 0, 0.9, 0.5, 0.6, '#fbfbf6', 0.2);
    for (const s of [-1, 1]) box(g, s * 0.4, 0.05, 0, 0.16, 0.14, 0.62, '#dfe8f0', 0.05);
    ball(g, 0, 0.18, 0, 0.3, 0.16, 0.3, '#7a4a2a');
    ball(g, 0, 0.36, 0, 0.22, 0.13, 0.22, '#7a4a2a');
    ball(g, 0, 0.5, 0, 0.13, 0.12, 0.13, '#7a4a2a');
    for (const s of [-1, 1]) ball(g, s * 0.08, 0.3, 0.22, 0.03, 0.04, 0.02, '#ffffff');
  },
  teeth(g) {
    box(g, 0, 0.15, 0, 0.7, 0.55, 0.6, '#ffffff', 0.22);
    for (const s of [-1, 1]) {
      const root = cyl(g, s * 0.18, -0.3, 0, 0.09, 0.45, '#f4f1e8', 0.15);
      root.rotation.z = -s * 0.15;
    }
    for (const s of [-1, 1]) ball(g, s * 0.13, 0.2, 0.3, 0.05, 0.06, 0.03, palette.ink);
    ball(g, 0, 0.04, 0.31, 0.1, 0.04, 0.03, '#b9494e');
    star(g, 0.32, 0.45, 0.2, 0.12, '#ffe98a', 0.06);
  },
  nosleep(g) {
    const shape = new T.Shape();
    shape.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(0.22, 0.1, 0.42, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const moon = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), mat('#ffd75e', 0.5));
    moon.position.z = -0.09;
    moon.castShadow = true;
    g.add(moon);
    ball(g, -0.32, 0.05, 0.14, 0.04, 0.05, 0.02, palette.ink);
    ball(g, -0.3, -0.12, 0.14, 0.06, 0.03, 0.02, '#b9494e');
    star(g, 0.45, 0.4, 0, 0.1, '#fff2b0', 0.06);
    star(g, 0.55, -0.2, 0, 0.07, '#fff2b0', 0.06);
  },
  // ---- дочь ----
  look(g) {
    for (const s of [-1, 1]) {
      ball(g, s * 0.32, 0, 0, 0.3, 0.34, 0.28, '#ffffff');
      ball(g, s * 0.32 + s * 0.02, 0.02, 0.24, 0.13, 0.15, 0.08, '#4f8bd6');
      ball(g, s * 0.32 + s * 0.02, 0.02, 0.3, 0.07, 0.08, 0.04, palette.ink);
      ball(g, s * 0.36, 0.08, 0.33, 0.025, 0.025, 0.02, '#ffffff');
      const lid = box(g, s * 0.32, 0.26, 0.12, 0.42, 0.06, 0.25, palette.hair, 0.02);
      lid.rotation.z = s * 0.15;
    }
  },
  play(g) {
    ball(g, 0, -0.15, 0, 0.32, 0.36, 0.28, '#b77c43');
    ball(g, 0, 0.3, 0, 0.3, 0.29, 0.27, '#c48d51');
    for (const s of [-1, 1]) {
      ball(g, s * 0.24, 0.52, 0, 0.11, 0.11, 0.09, '#b77c43');
      ball(g, s * 0.36, -0.15, 0.05, 0.12, 0.2, 0.12, '#bd8449');
      ball(g, s * 0.16, -0.45, 0.14, 0.13, 0.11, 0.16, '#bd8449');
      ball(g, s * 0.1, 0.34, 0.25, 0.03, 0.035, 0.02, palette.ink);
    }
    ball(g, 0, 0.24, 0.26, 0.12, 0.08, 0.06, '#e0ae72');
    ball(g, 0, 0.28, 0.32, 0.035, 0.03, 0.02, palette.ink);
    box(g, 0, 0.05, 0.22, 0.28, 0.1, 0.06, '#d94f6a', 0.03);
  },
  why(g) {
    arc(g, 0.3, 0.1, -0.2, Math.PI * 1.35, '#e5484d');
    const stem = cyl(g, 0.02, -0.28, 0, 0.1, 0.36, '#e5484d');
    stem.position.x = 0.1;
    ball(g, 0.1, -0.62, 0, 0.12, 0.12, 0.12, '#e5484d');
    g.children.forEach((c) => (c.position.y += 0.15));
  },
  draw(g) {
    ball(g, 0, -0.1, 0, 0.42, 0.32, 0.3, '#f7c6dd');
    ball(g, 0.34, 0.22, 0, 0.26, 0.24, 0.24, '#f7c6dd');
    const horn = cyl(g, 0.42, 0.55, 0, 0.07, 0.36, '#ffd75e', 0.01);
    horn.rotation.z = -0.2;
    for (let i = 0; i < 4; i++) ball(g, 0.1 - i * 0.1, 0.22 - i * 0.05, 0.02, 0.12, 0.12, 0.1, ['#8fd3ff', '#c39bff', '#ffd75e', '#8fe3a8'][i]);
    for (const s of [-1, 1]) cyl(g, -0.2 + s * 0.2, -0.45, s * 0.15, 0.07, 0.3, '#f0b5cf');
    ball(g, 0.52, 0.26, 0.2, 0.035, 0.045, 0.02, palette.ink);
    ball(g, -0.4, -0.1, 0, 0.1, 0.2, 0.1, '#c39bff');
  },
  cartoon(g) {
    box(g, 0, 0, 0, 1.0, 0.8, 0.6, '#b98352', 0.1);
    box(g, 0, 0.02, 0.31, 0.74, 0.56, 0.04, '#274b52', 0.06);
    ball(g, -0.1, 0.05, 0.34, 0.16, 0.14, 0.02, '#ffd75e');
    ball(g, 0.14, -0.06, 0.34, 0.1, 0.08, 0.02, '#f36f86');
    for (const y of [0.1, -0.1]) cyl(g, 0.42, y, 0.31, 0.04, 0.03, '#3b3f4f');
    for (const s of [-1, 1]) {
      const ant = cyl(g, s * 0.15, 0.62, 0, 0.02, 0.5, '#555');
      ant.rotation.z = -s * 0.5;
      ball(g, s * 0.27, 0.82, 0, 0.05, 0.05, 0.05, '#d94f6a');
    }
    for (const s of [-1, 1]) cyl(g, s * 0.35, -0.48, 0.1, 0.06, 0.16, '#6b4a2b');
  },
  // ---- работа ----
  deadline(g) {
    cyl(g, 0, 0, 0, 0.5, 0.26, '#e5484d').rotation.x = Math.PI / 2;
    cyl(g, 0, 0, 0.14, 0.42, 0.02, '#fff9ef').rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      box(g, Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0.16, 0.03, i % 3 ? 0.03 : 0.07, 0.01, palette.ink, 0.005);
    }
    const hand = box(g, 0.08, 0.1, 0.17, 0.05, 0.3, 0.02, palette.ink, 0.01);
    hand.rotation.z = -0.6;
    const hand2 = box(g, -0.06, 0.08, 0.17, 0.04, 0.22, 0.02, palette.ink, 0.01);
    hand2.rotation.z = 0.5;
    for (const s of [-1, 1]) {
      const bell = ball(g, s * 0.36, 0.42, 0, 0.17, 0.14, 0.17, '#f0b64a');
      bell.rotation.z = s * 0.5;
    }
    box(g, 0, 0.6, 0, 0.22, 0.05, 0.08, '#3b3f4f', 0.02);
    for (const s of [-1, 1]) {
      const leg = cyl(g, s * 0.25, -0.52, 0, 0.04, 0.2, '#3b3f4f');
      leg.rotation.z = s * 0.4;
    }
  },
  chat(g) {
    box(g, 0, 0.1, 0, 1.1, 0.72, 0.28, '#5fb4e8', 0.28);
    const tail = new T.Mesh(new T.ConeGeometry(0.14, 0.32, 4), mat('#5fb4e8'));
    tail.position.set(-0.32, -0.36, 0);
    tail.rotation.z = Math.PI + 0.5;
    g.add(tail);
    for (let i = -1; i <= 1; i++) ball(g, i * 0.24, 0.1, 0.15, 0.08, 0.08, 0.05, '#ffffff');
  },
  call(g) {
    const bar = box(g, 0, 0, 0, 0.32, 0.9, 0.3, '#3b3f4f', 0.14);
    bar.rotation.z = -0.5;
    for (const s of [-1, 1]) {
      const cap = ball(g, s * 0.32, s * 0.36, 0, 0.26, 0.22, 0.24, '#3b3f4f');
      cap.rotation.z = -0.5;
    }
    ball(g, -0.36, -0.36, 0.2, 0.08, 0.08, 0.04, '#5a5f70');
    star(g, 0.4, 0.5, 0.1, 0.1, '#8fd3ff', 0.05);
  },
  edits(g) {
    const body = cyl(g, 0, 0, 0, 0.14, 1.0, '#ffd75e');
    body.rotation.z = 0.7;
    const tip = cyl(g, 0, 0, 0, 0.14, 0.24, '#f4d7a8', 0.01);
    tip.position.set(Math.sin(0.7) * 0.62, -Math.cos(0.7) * 0.62, 0);
    tip.rotation.z = 0.7 + Math.PI;
    const lead = ball(g, Math.sin(0.7) * 0.74, -Math.cos(0.7) * 0.74, 0, 0.04, 0.04, 0.04, palette.ink);
    void lead;
    const eraser = cyl(g, -Math.sin(0.7) * 0.56, Math.cos(0.7) * 0.56, 0, 0.14, 0.14, '#f7a4b5');
    eraser.rotation.z = 0.7;
    const ring = cyl(g, -Math.sin(0.7) * 0.46, Math.cos(0.7) * 0.46, 0, 0.145, 0.07, '#b9c2cc');
    ring.rotation.z = 0.7;
  },
  beauty(g) {
    star(g, 0, 0.05, 0, 0.38, '#ffd75e');
    star(g, 0.45, 0.45, 0.05, 0.18, '#fff2b0', 0.08);
    star(g, -0.45, -0.35, 0.05, 0.14, '#fff2b0', 0.08);
  },
  logo(g) {
    const ring = new T.Mesh(new T.TorusGeometry(0.36, 0.09, 12, 40), mat('#3b3f4f', 0.5));
    ring.position.set(-0.12, 0.14, 0);
    ring.castShadow = true;
    g.add(ring);
    const glass = new T.Mesh(new T.CircleGeometry(0.3, 32), new T.MeshPhysicalMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.5, roughness: 0.1 }));
    glass.position.set(-0.12, 0.14, 0);
    g.add(glass);
    const handle = box(g, 0.32, -0.32, 0, 0.16, 0.5, 0.14, '#b98352', 0.06);
    handle.rotation.z = 0.78;
    textPlane(g, 'P', -0.12, 0.14, 0.02, 0.36, '#cfe9ff', palette.green);
  },
  refs(g) {
    box(g, 0, 0, 0, 1.0, 0.82, 0.12, '#d9a43f', 0.03);
    box(g, 0, 0, 0.05, 0.82, 0.64, 0.04, '#bfe0ee', 0.01);
    ball(g, 0.2, 0.15, 0.08, 0.1, 0.1, 0.02, '#ffd75e');
    box(g, 0, -0.14, 0.08, 0.8, 0.22, 0.02, '#8fe3a8', 0.02);
    ball(g, -0.2, -0.05, 0.08, 0.2, 0.14, 0.02, '#5c9c6c');
  },
  font(g) {
    box(g, -0.25, 0, 0, 0.55, 0.55, 0.55, '#e8eef4', 0.06);
    textPlane(g, 'A', -0.25, 0, 0.28, 0.5, '#e8eef4', '#e5484d');
    box(g, 0.3, -0.12, 0.1, 0.42, 0.42, 0.42, '#ffe9a8', 0.06);
    textPlane(g, 'я', 0.3, -0.12, 0.32, 0.38, '#ffe9a8', '#3b3f4f');
    g.children.forEach((c) => (c.rotation.y += 0.2));
  },
  // ---- хаос ----
  courier(g) {
    box(g, 0, 0, 0, 0.9, 0.75, 0.75, '#c9955c', 0.05);
    box(g, 0, 0.36, 0, 0.92, 0.06, 0.28, '#e2c49c', 0.02);
    box(g, 0, 0, 0.38, 0.92, 0.77, 0.02, '#c9955c', 0.02);
    box(g, 0, 0, 0.39, 0.3, 0.77, 0.01, '#e2c49c', 0.01);
    box(g, 0.25, 0.12, 0.4, 0.22, 0.16, 0.01, '#ffffff', 0.01);
    box(g, -0.2, -0.15, 0.4, 0.12, 0.12, 0.01, '#e5484d', 0.01);
  },
  wifi(g) {
    for (let i = 0; i < 3; i++) arc(g, 0.22 + i * 0.2, 0.06, Math.PI * 0.25, Math.PI * 0.75, i === 2 ? '#8fd3ff' : '#4f8bd6').position.y = -0.4;
    ball(g, 0, -0.38, 0, 0.09, 0.09, 0.09, '#4f8bd6');
    const slash = box(g, 0, 0, 0.12, 0.08, 1.1, 0.06, '#e5484d', 0.03);
    slash.rotation.z = 0.7;
  },
  juice(g) {
    box(g, 0, -0.05, 0, 0.6, 0.85, 0.42, '#ff9d3f', 0.05);
    box(g, 0, 0.0, 0.22, 0.44, 0.42, 0.02, '#fff0d0', 0.02);
    ball(g, 0, 0.02, 0.24, 0.13, 0.13, 0.02, '#ff6b3d');
    ball(g, 0.05, -0.02, 0.25, 0.04, 0.04, 0.02, '#8fe3a8');
    const straw = cyl(g, 0.22, 0.5, 0, 0.03, 0.5, '#ffffff');
    straw.rotation.z = -0.35;
    const puddle = ball(g, 0.2, -0.5, 0.15, 0.36, 0.05, 0.28, '#ff9d3f');
    puddle.castShadow = false;
  },
  figma(g) {
    const plate = ball(g, 0, 0, 0, 0.62, 0.5, 0.12, '#b98352');
    plate.rotation.x = 0.1;
    const dots = ['#e5484d', '#4f8bd6', '#ffd75e', '#8fe3a8', '#c39bff'];
    dots.forEach((c, i) => {
      const a = i * 1.1 + 0.4;
      ball(g, Math.cos(a) * 0.36, Math.sin(a) * 0.27, 0.12, 0.09, 0.09, 0.05, c);
    });
    const brush = cyl(g, 0.3, -0.1, 0.22, 0.03, 0.7, '#3b3f4f');
    brush.rotation.z = 0.6;
    ball(g, -0.02, -0.34, 0.22, 0.06, 0.09, 0.05, '#c39bff');
  },
  update(g) {
    for (const s of [-1, 1]) {
      arc(g, 0.42, 0.08, s > 0 ? 0.2 : Math.PI + 0.2, s > 0 ? Math.PI - 0.2 : Math.PI * 2 - 0.2, '#4f8bd6');
      const head = new T.Mesh(new T.ConeGeometry(0.16, 0.3, 4), mat('#4f8bd6'));
      head.position.set(s * 0.44, s * 0.12, 0);
      head.rotation.z = s > 0 ? Math.PI : 0;
      head.castShadow = true;
      g.add(head);
    }
  },
};

const fallback: Builder = (g) => {
  box(g, 0, 0, 0, 0.8, 0.8, 0.8, '#d6f0a4', 0.12);
};

export function buildProp(id: string): T.Group {
  const g = new T.Group();
  (builders[id] ?? fallback)(g);
  return g;
}

export const PROP_IDS = Object.keys(builders);
