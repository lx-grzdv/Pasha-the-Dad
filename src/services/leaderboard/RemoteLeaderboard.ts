import type { LeaderboardQuery, LeaderboardService, RunRecord } from './types';

const API_BASE = '/api/leaderboard/runs';

function versionParam(query?: LeaderboardQuery): Record<string, string> {
  return query?.version ? { version: query.version } : {};
}

async function fetchRuns(params: Record<string, string>): Promise<RunRecord[]> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}?${qs}`);
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const data = (await res.json()) as { runs: RunRecord[] };
  return data.runs;
}

export class RemoteLeaderboard implements LeaderboardService {
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}?limit=1`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async submitRun(run: RunRecord): Promise<void> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run),
    });
    if (!res.ok) throw new Error(`Leaderboard submit failed: ${res.status}`);
  }

  async getTopRuns(limit: number, query?: LeaderboardQuery): Promise<RunRecord[]> {
    return fetchRuns({ limit: String(limit), ...versionParam(query) });
  }

  async getTodayTopRuns(limit: number, query?: LeaderboardQuery): Promise<RunRecord[]> {
    return fetchRuns({ limit: String(limit), period: 'today', ...versionParam(query) });
  }

  async getPlayerBest(playerId: string, query?: LeaderboardQuery): Promise<RunRecord | null> {
    const runs = await fetchRuns({ playerId, limit: '1', ...versionParam(query) });
    return runs[0] ?? null;
  }
}
