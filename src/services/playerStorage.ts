const PLAYER_ID_KEY = 'pasha_dead_player_id';
const PLAYER_NAME_KEY = 'pasha_dead_player_name';

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function savePlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function getSavedPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
}
