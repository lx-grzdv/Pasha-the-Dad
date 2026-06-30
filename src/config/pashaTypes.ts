export type ItemId = 'slipper' | 'rattle';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  powerMod: number;
  radiusMod: number;
  babyBonus: number;
  workBonus: number;
  energyCost: number;
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  slipper: {
    id: 'slipper',
    name: 'Тапок',
    description: 'Универсальный. Средний удар.',
    powerMod: 1.0,
    radiusMod: 1.0,
    babyBonus: 0,
    workBonus: 0,
    energyCost: 1,
  },
  rattle: {
    id: 'rattle',
    name: 'Погремушка',
    description: 'Лучше против малыша. Слабее на работе.',
    powerMod: 0.9,
    radiusMod: 1.1,
    babyBonus: 0.25,
    workBonus: -0.15,
    energyCost: 0.8,
  },
};

export const PASHA_TYPES = {
  balancer: {
    id: 'balancer',
    name: 'Балансировщик',
    description: 'Базовый Паша. Без бонусов.',
    speedMod: 1,
    energyMod: 1,
  },
} as const;

export type PashaTypeId = keyof typeof PASHA_TYPES;
