import type { LeaderboardService, RunRecord } from './types';

const STORAGE_KEY = 'pasha_dead_runs';

function loadRuns(): RunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RunRecord[];
  } catch {
    return [];
  }
}

function saveRuns(runs: RunRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export class LocalLeaderboard implements LeaderboardService {
  async submitRun(run: RunRecord): Promise<void> {
    const runs = loadRuns();
    runs.push(run);
    runs.sort((a, b) => b.score - a.score);
    saveRuns(runs.slice(0, 500));
  }

  async getTopRuns(limit: number): Promise<RunRecord[]> {
    return loadRuns()
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getTodayTopRuns(limit: number): Promise<RunRecord[]> {
    return loadRuns()
      .filter((r) => isToday(r.createdAt))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getPlayerBest(playerId: string): Promise<RunRecord | null> {
    const playerRuns = loadRuns()
      .filter((r) => r.playerId === playerId)
      .sort((a, b) => b.score - a.score);
    return playerRuns[0] ?? null;
  }
}
