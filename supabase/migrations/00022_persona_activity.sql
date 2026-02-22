-- Phase D: Orchestrator Intelligence
-- High-level narrative activity log

CREATE TABLE IF NOT EXISTS persona_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_attention BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_activity_user_created
  ON persona_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_persona_activity_attention
  ON persona_activity(user_id, requires_attention, created_at DESC);

COMMENT ON TABLE persona_activity IS 'Narrative activity log for Author review and accountability';
