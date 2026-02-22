-- Phase D: Orchestrator Intelligence
-- Privacy modes + autonomy settings

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY,
  default_mode TEXT NOT NULL DEFAULT 'personal'
    CHECK (default_mode IN ('private', 'personal', 'professional')),
  contact_modes JSONB NOT NULL DEFAULT '{}'::jsonb,
  sensitive_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  autonomy_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (autonomy_level IN ('low', 'medium', 'high')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE privacy_settings IS 'Author-controlled privacy modes and autonomy dial for Orchestrator';
