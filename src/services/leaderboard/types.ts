import type { ItemId, PashaTypeId } from '../../config/pashaTypes';
import { GAME_VERSION } from '../../config/gameConfig';

export interface RunRecord {
  id: string;
  playerId: string;
  playerName: string;
  pashaType: PashaTypeId;
  itemType: ItemId;
  score: number;
  survivalTime: number;
  tasksDeflected: number;
  tasksMissed: number;
  maxChaosLevel: number;
  babyFinal: number;
  daughterFinal: number;
  workFinal: number;
  energyFinal: number;
  resultStatus: string;
  gameVersion: string;
  createdAt: string;
}

/** Фильтр по версии игры: 2D и 3D считают очки по-разному. */
export interface LeaderboardQuery {
  version?: string;
}

export interface LeaderboardService {
  submitRun(run: RunRecord): Promise<void>;
  getTopRuns(limit: number, query?: LeaderboardQuery): Promise<RunRecord[]>;
  getTodayTopRuns(limit: number, query?: LeaderboardQuery): Promise<RunRecord[]>;
  getPlayerBest(playerId: string, query?: LeaderboardQuery): Promise<RunRecord | null>;
}

export function createRunRecord(
  partial: Omit<RunRecord, 'id' | 'gameVersion' | 'createdAt'>
): RunRecord {
  return {
    ...partial,
    id: crypto.randomUUID(),
    gameVersion: GAME_VERSION,
    createdAt: new Date().toISOString(),
  };
}
