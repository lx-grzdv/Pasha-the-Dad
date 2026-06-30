import { LocalLeaderboard } from './LocalLeaderboard';
import type { LeaderboardService } from './types';

let instance: LeaderboardService | null = null;

export function getLeaderboard(): LeaderboardService {
  if (!instance) {
    const adapter = import.meta.env.VITE_LEADERBOARD_ADAPTER ?? 'local';
    if (adapter === 'remote') {
      // Future: RemoteLeaderboard
      console.warn('Remote leaderboard not implemented, using local');
    }
    instance = new LocalLeaderboard();
  }
  return instance;
}

export type { LeaderboardService, RunRecord } from './types';
export { createRunRecord } from './types';
