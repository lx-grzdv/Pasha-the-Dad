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

/** Якорь и параметры каждой конечности относительно центра Паши */
export const LIMB = {
  leftFoot: { anchorX: -16, anchorY: 42, radius: 42, arc: Math.PI * 0.55, power: 0.7, hitR: 26 },
  rightFoot: { anchorX: 16, anchorY: 42, radius: 42, arc: Math.PI * 0.55, power: 0.7, hitR: 26 },
  /** Точка «паха» — MJ-thrust, общий origin для ног */
  groin: { anchorX: 0, anchorY: 24, radius: 48, arc: Math.PI * 0.5, power: 0.75, hitR: 30 },
  leftHand: { anchorX: -38, anchorY: 2, radius: 68, arc: Math.PI * 0.85, power: 1.0, hitR: 36 },
  rightHand: { anchorX: 38, anchorY: 2, radius: 68, arc: Math.PI * 0.85, power: 1.0, hitR: 36 },
  bothHands: { anchorX: 0, anchorY: -8, radius: 88, arc: Math.PI * 1.15, power: 1.3, hitR: 42 },
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

/** Пороги комбо пахом (MJ-thrust) */
export const THRUST_COMBO = {
  phraseAt: 3,
  bonusAt: 3,
  bonusMult: 0.25,
  megaAt: 5,
  megaMult: 0.5,
} as const;
