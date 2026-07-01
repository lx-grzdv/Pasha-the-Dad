/**
 * Мини-синтезатор на Web Audio: все звуки генерируются кодом, без ассетов.
 * AudioContext создаётся лениво — первый вызов происходит после клика/клавиши,
 * так что браузерная политика autoplay не мешает.
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

interface ToneOptions {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  vol?: number;
  delay?: number;
}

function tone({ type = 'square', from, to, dur, vol = 0.12, delay = 0 }: ToneOptions): void {
  const ac = getCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface NoiseOptions {
  dur: number;
  vol?: number;
  filterFrom?: number;
  filterTo?: number;
  delay?: number;
}

function noise({ dur, vol = 0.16, filterFrom = 2400, filterTo = 300, delay = 0 }: NoiseOptions): void {
  const ac = getCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(1, filterTo), t0 + dur);
  filter.Q.value = 0.9;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

/** Шлепок тапка: короткий шумовой удар + падающий тон */
export function sfxDeflect(): void {
  noise({ dur: 0.07, vol: 0.2, filterFrom: 3200, filterTo: 500 });
  tone({ type: 'square', from: 340, to: 150, dur: 0.08, vol: 0.08 });
}

/** Топоток вбегающего Паши */
export function sfxStep(): void {
  noise({ dur: 0.04, vol: 0.08, filterFrom: 700, filterTo: 250 });
}

/** Хэдбатт: глухой деревянный бонк */
export function sfxBonk(): void {
  noise({ dur: 0.05, vol: 0.12, filterFrom: 900, filterTo: 400 });
  tone({ type: 'square', from: 170, to: 85, dur: 0.11, vol: 0.12 });
}

/** Жирная задача принята, но ещё жива */
export function sfxPartialHit(): void {
  noise({ dur: 0.05, vol: 0.14, filterFrom: 1800, filterTo: 700 });
  tone({ type: 'square', from: 200, to: 120, dur: 0.09, vol: 0.09 });
}

/** Пах-комбо: восходящее «уиии» */
export function sfxThrust(streak: number): void {
  const base = 320 + Math.min(streak, 8) * 40;
  tone({ type: 'sawtooth', from: base, to: base * 2.1, dur: 0.16, vol: 0.09 });
}

export function sfxCombo(): void {
  tone({ from: 523, dur: 0.07, vol: 0.09 });
  tone({ from: 659, dur: 0.07, vol: 0.09, delay: 0.07 });
  tone({ from: 784, dur: 0.1, vol: 0.09, delay: 0.14 });
}

export function sfxMiss(): void {
  tone({ type: 'square', from: 220, to: 70, dur: 0.2, vol: 0.11 });
}

/** Q/E/R сработали */
export function sfxAction(): void {
  tone({ from: 440, dur: 0.06, vol: 0.1 });
  tone({ from: 660, dur: 0.08, vol: 0.1, delay: 0.06 });
}

/** Q/E/R на кулдауне */
export function sfxDenied(): void {
  tone({ type: 'sawtooth', from: 110, to: 90, dur: 0.12, vol: 0.09 });
}

export function sfxLowMeter(): void {
  tone({ from: 880, dur: 0.09, vol: 0.08 });
  tone({ from: 880, dur: 0.09, vol: 0.08, delay: 0.14 });
}

export function sfxWave(): void {
  tone({ type: 'sawtooth', from: 196, to: 392, dur: 0.22, vol: 0.1 });
  tone({ type: 'sawtooth', from: 392, to: 784, dur: 0.22, vol: 0.08, delay: 0.18 });
}

export function sfxDefeat(): void {
  const seq = [392, 330, 262, 196, 131];
  seq.forEach((f, i) => tone({ type: 'sawtooth', from: f, to: f * 0.92, dur: 0.22, vol: 0.11, delay: i * 0.16 }));
  noise({ dur: 0.6, vol: 0.1, filterFrom: 900, filterTo: 120, delay: 0.1 });
}

export function sfxWin(): void {
  const seq = [392, 523, 659, 784, 1046];
  seq.forEach((f, i) => tone({ from: f, dur: 0.14, vol: 0.1, delay: i * 0.11 }));
}

export function sfxClick(): void {
  tone({ from: 760, to: 620, dur: 0.05, vol: 0.07 });
}

export function sfxPause(on: boolean): void {
  tone({ from: on ? 520 : 380, to: on ? 380 : 520, dur: 0.1, vol: 0.08 });
}
