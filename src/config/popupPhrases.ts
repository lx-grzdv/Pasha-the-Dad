export const DEFLECT_PHRASES = [
  'Отбил!',
  'Не сегодня',
  'Держусь',
  'Ещё один',
  'Паша держится',
];

export const MISS_PHRASES = [
  'Пропустил...',
  'В кучу!',
  'Ну всё',
  'Завалило',
  'Не успел',
];

export const COMBO_PHRASES: Record<number, string> = {
  5: 'Комбо x1.2!',
  10: 'На коне!',
  20: 'Турбо-папа!',
};

export const LOW_METER_PHRASES: Record<string, string> = {
  baby: 'Малыш на грани!',
  daughter: 'Дочь скучает!',
  work: 'Работа горит!',
  energy: 'Паша выдыхается...',
};

export function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}
