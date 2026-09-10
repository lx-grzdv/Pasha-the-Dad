import { HybridLeaderboard } from './HybridLeaderboard';
import { LocalLeaderboard } from './LocalLeaderboard';
import { RemoteLeaderboard } from './RemoteLeaderboard';
import type { LeaderboardService } from './types';

let instance: LeaderboardService | null = null;

export function getLeaderboard(): LeaderboardService {
  if (!instance) {
    // В dev нет serverless-функции: запрос к /api уронил бы Vite в оверлей ошибки.
    const adapter = import.meta.env.VITE_LEADERBOARD_ADAPTER ?? (import.meta.env.DEV ? 'local' : 'hybrid');
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

export type { LeaderboardQuery, LeaderboardService, RunRecord } from './types';
export { createRunRecord } from './types';
