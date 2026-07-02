export type TaskType = 'baby' | 'daughter' | 'work' | 'chaos';

export type TaskMovement = 'straight' | 'zigzag';

export interface TaskDefinition {
  id: string;
  label: string;
  /** Эмодзи-иконка — главный визуал стикера, подпись вторична */
  icon: string;
  type: TaskType;
  points: number;
  meterDamage: number;
  chaosOnMiss: number;
  /** Множитель скорости полёта: быстрые мелкие против медленных жирных */
  speedMod?: number;
  /** Сколько ударов нужно, чтобы отбить (по умолчанию 1) */
  hp?: number;
  /** Траектория: прямая или зигзаг */
  movement?: TaskMovement;
}

export const TASK_DEFINITIONS: TaskDefinition[] = [
  // Малыш
  { id: 'cry', label: 'плач', icon: '😭', type: 'baby', points: 80, meterDamage: 12, chaosOnMiss: 0.3, speedMod: 1.4 },
  { id: 'bottle', label: 'бутылочка', icon: '🍼', type: 'baby', points: 60, meterDamage: 10, chaosOnMiss: 0.2, speedMod: 1.15 },
  { id: 'diaper', label: 'памперс', icon: '💩', type: 'baby', points: 70, meterDamage: 11, chaosOnMiss: 0.25 },
  { id: 'teeth', label: 'зубки', icon: '🦷', type: 'baby', points: 120, meterDamage: 13, chaosOnMiss: 0.35, speedMod: 0.75, hp: 2 },
  { id: 'nosleep', label: 'не спит', icon: '🌙', type: 'baby', points: 75, meterDamage: 11, chaosOnMiss: 0.3, speedMod: 1.1 },
  // Дочь
  { id: 'look', label: 'папа смотри', icon: '👀', type: 'daughter', points: 75, meterDamage: 10, chaosOnMiss: 0.25, speedMod: 1.1 },
  { id: 'play', label: 'поиграй', icon: '🧸', type: 'daughter', points: 65, meterDamage: 9, chaosOnMiss: 0.2 },
  { id: 'why', label: 'а почему?', icon: '❓', type: 'daughter', points: 55, meterDamage: 8, chaosOnMiss: 0.2, speedMod: 1.2 },
  { id: 'draw', label: 'нарисуй пони', icon: '🦄', type: 'daughter', points: 70, meterDamage: 9, chaosOnMiss: 0.25 },
  { id: 'cartoon', label: 'мультик', icon: '📺', type: 'daughter', points: 60, meterDamage: 8, chaosOnMiss: 0.2, speedMod: 1.15 },
  // Работа: Паша — дизайнер
  { id: 'deadline', label: 'дедлайн', icon: '⏰', type: 'work', points: 160, meterDamage: 14, chaosOnMiss: 0.4, speedMod: 0.65, hp: 2 },
  { id: 'chat', label: 'срочно в чат', icon: '💬', type: 'work', points: 100, meterDamage: 12, chaosOnMiss: 0.35, speedMod: 1.1 },
  { id: 'call', label: 'созвон', icon: '📞', type: 'work', points: 110, meterDamage: 13, chaosOnMiss: 0.35, speedMod: 0.85 },
  { id: 'edits', label: 'правки v8', icon: '✏️', type: 'work', points: 115, meterDamage: 12, chaosOnMiss: 0.35, speedMod: 1.25 },
  { id: 'beauty', label: 'сделай красиво', icon: '✨', type: 'work', points: 170, meterDamage: 14, chaosOnMiss: 0.4, speedMod: 0.7, hp: 2 },
  { id: 'logo', label: 'лого побольше', icon: '🔍', type: 'work', points: 95, meterDamage: 11, chaosOnMiss: 0.3 },
  { id: 'refs', label: 'референсы', icon: '🖼', type: 'work', points: 90, meterDamage: 10, chaosOnMiss: 0.3, speedMod: 1.3 },
  { id: 'font', label: 'шрифт съехал', icon: '🔤', type: 'work', points: 100, meterDamage: 11, chaosOnMiss: 0.3 },
  // Хаос
  { id: 'courier', label: 'курьер', icon: '📦', type: 'chaos', points: 150, meterDamage: 8, chaosOnMiss: 0.5, speedMod: 1.15, movement: 'zigzag' },
  { id: 'wifi', label: 'Wi-Fi', icon: '📶', type: 'chaos', points: 130, meterDamage: 7, chaosOnMiss: 0.45, movement: 'zigzag' },
  { id: 'juice', label: 'разлился сок', icon: '🧃', type: 'chaos', points: 140, meterDamage: 9, chaosOnMiss: 0.5, speedMod: 0.9 },
  { id: 'figma', label: 'фигма лагает', icon: '🎨', type: 'chaos', points: 145, meterDamage: 8, chaosOnMiss: 0.5, movement: 'zigzag' },
  { id: 'update', label: 'вышел апдейт', icon: '🔄', type: 'chaos', points: 135, meterDamage: 7, chaosOnMiss: 0.45, speedMod: 0.85 },
];

export function getTaskColor(type: TaskType): number {
  const map = { baby: 0xff5fa2, daughter: 0xffd166, work: 0x4cc9f0, chaos: 0xff8a4c };
  return map[type];
}

export function getMeterKeyForType(type: TaskType): 'baby' | 'daughter' | 'work' | null {
  if (type === 'baby') return 'baby';
  if (type === 'daughter') return 'daughter';
  if (type === 'work') return 'work';
  return null;
}
