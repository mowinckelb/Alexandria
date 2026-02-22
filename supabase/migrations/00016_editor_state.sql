-- Phase B: Continuous Editor Agent
-- Tracks autonomous editor cycle state per user

CREATE TABLE IF NOT EXISTS editor_state (
  user_id UUID PRIMARY KEY,
  last_cycle_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  activity_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (activity_level IN ('low', 'medium', 'high')),
  sleep_duration_minutes INTEGER NOT NULL DEFAULT 10,
  next_cycle_at TIMESTAMPTZ,
  cycle_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_state_next_cycle
  ON editor_state(next_cycle_at);

CREATE INDEX IF NOT EXISTS idx_editor_state_last_cycle
  ON editor_state(last_cycle_at DESC);

COMMENT ON TABLE editor_state IS 'Autonomous Editor runtime state and scheduling for each user';
