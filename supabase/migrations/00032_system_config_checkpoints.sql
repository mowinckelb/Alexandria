-- Phase G: system config checkpoint history for blueprint iteration

CREATE TABLE IF NOT EXISTS system_config_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version_label TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_checkpoints_user_created
  ON system_config_checkpoints(user_id, created_at DESC);

COMMENT ON TABLE system_config_checkpoints IS 'Checkpoint history for system config rollback and audit';
