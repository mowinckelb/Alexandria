-- Phase G support: DB-backed system config for immediate consistency
-- Vault remains backup/export source of truth for portability.

CREATE TABLE IF NOT EXISTS system_configs (
  user_id UUID PRIMARY KEY,
  version TEXT NOT NULL DEFAULT 'default-v1',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_configs_updated
  ON system_configs(updated_at DESC);

COMMENT ON TABLE system_configs IS 'Selected machine system config (DB-backed for low-latency reads)';
