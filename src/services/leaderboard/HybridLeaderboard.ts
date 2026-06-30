import { LocalLeaderboard } from './LocalLeaderboard';
import { RemoteLeaderboard } from './RemoteLeaderboard';
import type { LeaderboardService, RunRecord } from './types';

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

  async getTopRuns(limit: number): Promise<RunRecord[]> {
    try {
      const runs = await this.remote.getTopRuns(limit);
      this.globalActive = true;
      return runs;
    } catch {
      return this.local.getTopRuns(limit);
    }
  }

  async getTodayTopRuns(limit: number): Promise<RunRecord[]> {
    try {
      const runs = await this.remote.getTodayTopRuns(limit);
      this.globalActive = true;
      return runs;
    } catch {
      return this.local.getTodayTopRuns(limit);
    }
  }

  async getPlayerBest(playerId: string): Promise<RunRecord | null> {
    try {
      const best = await this.remote.getPlayerBest(playerId);
      this.globalActive = true;
      return best;
    } catch {
      return this.local.getPlayerBest(playerId);
    }
  }
}
