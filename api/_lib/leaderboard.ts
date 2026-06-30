import type { RunRecord } from '../../src/services/leaderboard/types';

export interface DbRunRow {
  id: string;
  player_id: string;
  player_name: string;
  pasha_type: string;
  item_type: string;
  score: number;
  survival_time: number;
  tasks_deflected: number;
  tasks_missed: number;
  max_chaos_level: number;
  baby_final: number;
  daughter_final: number;
  work_final: number;
  energy_final: number;
  result_status: string;
  game_version: string;
  created_at: string | Date;
}

export function rowToRunRecord(row: DbRunRow): RunRecord {
  return {
    id: row.id,
    playerId: row.player_id,
    playerName: row.player_name,
    pashaType: row.pasha_type as RunRecord['pashaType'],
    itemType: row.item_type as RunRecord['itemType'],
    score: row.score,
    survivalTime: row.survival_time,
    tasksDeflected: row.tasks_deflected,
    tasksMissed: row.tasks_missed,
    maxChaosLevel: row.max_chaos_level,
    babyFinal: row.baby_final,
    daughterFinal: row.daughter_final,
    workFinal: row.work_final,
    energyFinal: row.energy_final,
    resultStatus: row.result_status,
    gameVersion: row.game_version,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export function validateRunInput(body: unknown): RunRecord | null {
  if (!body || typeof body !== 'object') return null;
  const r = body as Partial<RunRecord>;

  if (
    typeof r.id !== 'string' ||
    typeof r.playerId !== 'string' ||
    typeof r.playerName !== 'string' ||
    typeof r.pashaType !== 'string' ||
    typeof r.itemType !== 'string' ||
    typeof r.score !== 'number' ||
    typeof r.survivalTime !== 'number' ||
    typeof r.tasksDeflected !== 'number' ||
    typeof r.tasksMissed !== 'number' ||
    typeof r.maxChaosLevel !== 'number' ||
    typeof r.babyFinal !== 'number' ||
    typeof r.daughterFinal !== 'number' ||
    typeof r.workFinal !== 'number' ||
    typeof r.energyFinal !== 'number' ||
    typeof r.resultStatus !== 'string' ||
    typeof r.gameVersion !== 'string' ||
    typeof r.createdAt !== 'string'
  ) {
    return null;
  }

  const name = r.playerName.trim().slice(0, 24);
  if (!name || r.score < 0 || r.score > 999_999 || r.survivalTime < 0 || r.survivalTime > 600) {
    return null;
  }

  return { ...r, playerName: name } as RunRecord;
}

export function parseLimit(value: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 100);
}
