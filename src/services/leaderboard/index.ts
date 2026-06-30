import { HybridLeaderboard } from './HybridLeaderboard';
import { LocalLeaderboard } from './LocalLeaderboard';
import { RemoteLeaderboard } from './RemoteLeaderboard';
import type { LeaderboardService } from './types';

let instance: LeaderboardService | null = null;

export function getLeaderboard(): LeaderboardService {
  if (!instance) {
    const adapter = import.meta.env.VITE_LEADERBOARD_ADAPTER ?? 'hybrid';
    switch (adapter) {
      case 'local':
        instance = new LocalLeaderboard();
        break;
      case 'remote':
        instance = new RemoteLeaderboard();
        break;
      default:
        instance = new HybridLeaderboard();
        break;
    }
  }
  return instance;
}

export type { LeaderboardService, RunRecord } from './types';
export { createRunRecord } from './types';
