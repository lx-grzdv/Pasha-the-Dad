import { LocalLeaderboard } from './LocalLeaderboard';
import { RemoteLeaderboard } from './RemoteLeaderboard';
import type { LeaderboardQuery, LeaderboardService, RunRecord } from './types';

/** Saves locally and syncs to server when Postgres is connected. */
export class HybridLeaderboard implements LeaderboardService {
  private local = new LocalLeaderboard();
  private remote = new RemoteLeaderboard();
  private globalActive = false;

  async isGlobal(): Promise<boolean> {
    if (this.globalActive) return true;
    this.globalActive = await this.remote.isAvailable();
    return this.globalActive;
  }

  async submitRun(run: RunRecord): Promise<void> {
    await this.local.submitRun(run);
    try {
      await this.remote.submitRun(run);
      this.globalActive = true;
    } catch {
      // Local copy is enough when DB is offline.
    }
  }

  async getTopRuns(limit: number, query?: LeaderboardQuery): Promise<RunRecord[]> {
    try {
      const runs = await this.remote.getTopRuns(limit, query);
      this.globalActive = true;
      return runs;
    } catch {
      return this.local.getTopRuns(limit, query);
    }
  }

  async getTodayTopRuns(limit: number, query?: LeaderboardQuery): Promise<RunRecord[]> {
    try {
      const runs = await this.remote.getTodayTopRuns(limit, query);
      this.globalActive = true;
      return runs;
    } catch {
      return this.local.getTodayTopRuns(limit, query);
    }
  }

  async getPlayerBest(playerId: string, query?: LeaderboardQuery): Promise<RunRecord | null> {
    try {
      const best = await this.remote.getPlayerBest(playerId, query);
      this.globalActive = true;
      return best;
    } catch {
      return this.local.getPlayerBest(playerId, query);
    }
  }
}
