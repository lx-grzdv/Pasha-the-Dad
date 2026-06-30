export const GAME_VERSION = 'pasha-the-dead@0.1.0';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const RUN_DURATION_SEC = 180;

export const COLORS = {
  bg: 0x0a0a0a,
  bgGradient: 0x1a0a2e,
  baby: 0xff6b9d,
  daughter: 0xffd93d,
  work: 0x4dabf7,
  chaos: 0xff922b,
  pashaBody: 0x5c6bc0,
  pashaHead: 0xffcc80,
  uiText: '#ffffff',
  uiAccent: '#39ff14',
  uiDanger: '#ff4757',
  meterBg: 0x333333,
};

export const LIMB = {
  feet: { radius: 45, arc: Math.PI * 0.6, power: 0.7 },
  leftHand: { radius: 70, arc: Math.PI * 0.8, power: 1.0 },
  rightHand: { radius: 70, arc: Math.PI * 0.8, power: 1.0 },
  bothHands: { radius: 90, arc: Math.PI * 1.2, power: 1.3 },
} as const;

export const COOLDOWNS = {
  tossBaby: 8000,
  kindergarten: 20000,
  bathroom: 12000,
} as const;

export const DURATIONS = {
  tossBaby: 6000,
  kindergarten: 18000,
  bathroom: 6000,
} as const;

export const PILE = {
  maxVisible: 40,
  sinkPerMiss: 3,
  missInterval: 2,
} as const;

export const COMBO_THRESHOLDS = [
  { count: 5, multiplier: 1.2 },
  { count: 10, multiplier: 1.5 },
  { count: 20, multiplier: 2.0 },
] as const;
