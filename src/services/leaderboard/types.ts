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

export interface LeaderboardService {
  submitRun(run: RunRecord): Promise<void>;
  getTopRuns(limit: number): Promise<RunRecord[]>;
  getTodayTopRuns(limit: number): Promise<RunRecord[]>;
  getPlayerBest(playerId: string): Promise<RunRecord | null>;
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
