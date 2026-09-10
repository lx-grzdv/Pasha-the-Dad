/**
 * Фоновая музыка: короткий лоу-фай луп, который синтезируется на лету
 * без аудиофайлов. Планировщик заглядывает на четверть секунды вперёд,
 * так что рваный requestAnimationFrame на ритм не влияет.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;
let nextBeat = 0;
let beatIndex = 0;
let volume = 0.55;
let enabled = false;

const BPM = 92;
const BEAT = 60 / BPM;
/** Cmaj7 · Am7 · Fmaj7 · G7 — по два такта на аккорд, частоты в герцах. */
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 349.23],
];
const BASS = [65.41, 55.0, 43.65, 49.0];
const ARP_STEPS = [0, 2, 1, 3, 2, 1, 3, 2];

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2600;
    master.connect(lowpass).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function note(type: OscillatorType, freq: number, t0: number, dur: number, vol: number, detune = 0): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function hat(t0: number, vol: number): void {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

function kick(t0: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
  gain.gain.setValueAtTime(0.5, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.25);
}

function scheduleBeat(index: number, t0: number): void {
  const bar = Math.floor(index / 4);
  const beat = index % 4;
  const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
  const bass = BASS[Math.floor(bar / 2) % BASS.length];
  if (beat === 0) {
    for (const f of chord) {
      note('sine', f, t0, BEAT * 4, 0.05);
      note('triangle', f, t0, BEAT * 4, 0.025, 6);
    }
  }
  if (beat === 0 || beat === 2) {
    kick(t0);
    note('triangle', bass, t0, BEAT * 0.9, 0.22);
  }
  if (beat === 3 && bar % 2 === 1) note('triangle', bass * 1.5, t0 + BEAT / 2, BEAT * 0.45, 0.16);
  for (let i = 0; i < 2; i++) {
    const t = t0 + (i * BEAT) / 2;
    hat(t, i ? 0.05 : 0.09);
    const step = ARP_STEPS[(beat * 2 + i) % ARP_STEPS.length];
    note('square', chord[step] * 2, t, BEAT * 0.35, 0.028);
  }
}

function tick(): void {
  if (!ctx) return;
  while (nextBeat < ctx.currentTime + 0.3) {
    scheduleBeat(beatIndex, nextBeat);
    beatIndex++;
    nextBeat += BEAT;
  }
}

/** Запуск после первого жеста пользователя: браузеры блокируют автоплей. */
export function startMusic(): void {
  const ac = getCtx();
  if (!ac || !master) return;
  enabled = true;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(volume, ac.currentTime, 0.4);
  if (timer !== null) return;
  nextBeat = ac.currentTime + 0.1;
  beatIndex = 0;
  tick();
  timer = window.setInterval(tick, 100);
}

export function stopMusic(): void {
  enabled = false;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

export function isMusicOn(): boolean {
  return enabled;
}

/** Приглушение на паузе и в меню без остановки лупа. */
export function duckMusic(duck: boolean): void {
  if (!ctx || !master || !enabled) return;
  master.gain.setTargetAtTime(duck ? volume * 0.35 : volume, ctx.currentTime, 0.3);
}

export function setMusicMuted(muted: boolean): void {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(muted ? 0 : enabled ? volume : 0, ctx.currentTime, 0.2);
}
