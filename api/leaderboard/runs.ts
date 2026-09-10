import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getDatabaseUrl,
  parseLimit,
  rowToRunRecord,
  validateRunInput,
  type DbRunRow,
  type RunRecord,
} from '../_lib/leaderboard';

type Sql = NeonQueryFunction<false, false>;

function getSql(): Sql | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  return neon(url);
}

async function insertRun(sql: Sql, run: RunRecord): Promise<void> {
  await sql`
    INSERT INTO runs (
      id, player_id, player_name, pasha_type, item_type,
      score, survival_time, tasks_deflected, tasks_missed, max_chaos_level,
      baby_final, daughter_final, work_final, energy_final,
      result_status, game_version, created_at
    ) VALUES (
      ${run.id}::uuid, ${run.playerId}::uuid, ${run.playerName}, ${run.pashaType}, ${run.itemType},
      ${run.score}, ${run.survivalTime}, ${run.tasksDeflected}, ${run.tasksMissed}, ${run.maxChaosLevel},
      ${run.babyFinal}, ${run.daughterFinal}, ${run.workFinal}, ${run.energyFinal},
      ${run.resultStatus}, ${run.gameVersion}, ${run.createdAt}::timestamptz
    )
  `;
}

async function fetchTop(sql: Sql, limit: number, period?: string, version?: string): Promise<DbRunRow[]> {
  // Версии игры (2D и 3D) не сравнимы по очкам, поэтому фильтр по game_version.
  const versionFilter = version ?? '%';
  if (period === 'today') {
    return sql`
      SELECT * FROM runs
      WHERE created_at >= CURRENT_DATE AND game_version LIKE ${versionFilter}
      ORDER BY score DESC
      LIMIT ${limit}
    ` as unknown as Promise<DbRunRow[]>;
  }

  return sql`
    SELECT * FROM runs
    WHERE game_version LIKE ${versionFilter}
    ORDER BY score DESC
    LIMIT ${limit}
  ` as unknown as Promise<DbRunRow[]>;
}

async function fetchPlayerBest(sql: Sql, playerId: string, version?: string): Promise<DbRunRow | null> {
  const versionFilter = version ?? '%';
  const rows = (await sql`
    SELECT * FROM runs
    WHERE player_id = ${playerId}::uuid AND game_version LIKE ${versionFilter}
    ORDER BY score DESC
    LIMIT 1
  `) as DbRunRow[];
  return rows[0] ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const sql = getSql();
  if (!sql) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    if (req.method === 'POST') {
      const run = validateRunInput(req.body);
      if (!run) {
        res.status(400).json({ error: 'Invalid run payload' });
        return;
      }
      await insertRun(sql, run);
      res.status(201).json({ ok: true });
      return;
    }

    if (req.method === 'GET') {
      const limit = parseLimit(req.query.limit, 10);
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const playerId =
        typeof req.query.playerId === 'string' ? req.query.playerId : undefined;
      const version = typeof req.query.version === 'string' ? req.query.version.slice(0, 64) : undefined;

      if (playerId) {
        const row = await fetchPlayerBest(sql, playerId, version);
        res.status(200).json({ runs: row ? [rowToRunRecord(row)] : [] });
        return;
      }

      const rows = await fetchTop(sql, limit, period, version);
      res.status(200).json({ runs: rows.map((row) => rowToRunRecord(row)) });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Leaderboard API error:', err);
    res.status(500).json({ error: 'Internal server error', detail: message });
  }
}
