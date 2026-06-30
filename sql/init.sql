-- Leaderboard schema for Neon Postgres (Vercel Marketplace)
-- Run once in Neon SQL Editor or via psql $POSTGRES_URL -f sql/init.sql

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  pasha_type TEXT NOT NULL,
  item_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  survival_time INTEGER NOT NULL,
  tasks_deflected INTEGER NOT NULL,
  tasks_missed INTEGER NOT NULL,
  max_chaos_level INTEGER NOT NULL,
  baby_final INTEGER NOT NULL,
  daughter_final INTEGER NOT NULL,
  work_final INTEGER NOT NULL,
  energy_final INTEGER NOT NULL,
  result_status TEXT NOT NULL,
  game_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_score ON runs (score DESC);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_player_id ON runs (player_id);
