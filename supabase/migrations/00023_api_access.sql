-- Phase F: External API and Library foundations
-- API keys + usage tracking

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response_length INTEGER NOT NULL DEFAULT 0,
  cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_created
  ON api_keys(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_created
  ON api_usage(api_key_id, created_at DESC);

COMMENT ON TABLE api_keys IS 'External API keys for querying Personas';
COMMENT ON TABLE api_usage IS 'Usage and billing telemetry for Persona API calls';
