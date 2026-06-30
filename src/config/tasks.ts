export type TaskType = 'baby' | 'daughter' | 'work' | 'chaos';

export interface TaskDefinition {
  id: string;
  label: string;
  type: TaskType;
  points: number;
  meterDamage: number;
  chaosOnMiss: number;
}

export const TASK_DEFINITIONS: TaskDefinition[] = [
  { id: 'cry', label: 'плач', type: 'baby', points: 80, meterDamage: 12, chaosOnMiss: 0.3 },
  { id: 'bottle', label: 'бутылочка', type: 'baby', points: 60, meterDamage: 10, chaosOnMiss: 0.2 },
  { id: 'diaper', label: 'памперс', type: 'baby', points: 70, meterDamage: 11, chaosOnMiss: 0.25 },
  { id: 'look', label: 'папа смотри', type: 'daughter', points: 75, meterDamage: 10, chaosOnMiss: 0.25 },
  { id: 'play', label: 'поиграй', type: 'daughter', points: 65, meterDamage: 9, chaosOnMiss: 0.2 },
  { id: 'why', label: 'а почему?', type: 'daughter', points: 55, meterDamage: 8, chaosOnMiss: 0.2 },
  { id: 'deadline', label: 'дедлайн', type: 'work', points: 120, meterDamage: 14, chaosOnMiss: 0.4 },
  { id: 'chat', label: 'срочно в чат', type: 'work', points: 100, meterDamage: 12, chaosOnMiss: 0.35 },
  { id: 'call', label: 'созвон', type: 'work', points: 110, meterDamage: 13, chaosOnMiss: 0.35 },
  { id: 'courier', label: 'курьер', type: 'chaos', points: 150, meterDamage: 8, chaosOnMiss: 0.5 },
  { id: 'wifi', label: 'Wi-Fi', type: 'chaos', points: 130, meterDamage: 7, chaosOnMiss: 0.45 },
  { id: 'juice', label: 'разлился сок', type: 'chaos', points: 140, meterDamage: 9, chaosOnMiss: 0.5 },
];

export function getTaskColor(type: TaskType): number {
  const map = { baby: 0xff6b9d, daughter: 0xffd93d, work: 0x4dabf7, chaos: 0xff922b };
  return map[type];
}

export function getMeterKeyForType(type: TaskType): 'baby' | 'daughter' | 'work' | null {
  if (type === 'baby') return 'baby';
  if (type === 'daughter') return 'daughter';
  if (type === 'work') return 'work';
  return null;
}
