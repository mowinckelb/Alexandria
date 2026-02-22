-- Phase E bridge contact bindings:
-- maps external channel identifiers to Alexandria users and privacy defaults

CREATE TABLE IF NOT EXISTS channel_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  external_contact_id TEXT NOT NULL,
  privacy_mode TEXT NOT NULL DEFAULT 'professional'
    CHECK (privacy_mode IN ('private', 'personal', 'professional')),
  audience TEXT NOT NULL DEFAULT 'external'
    CHECK (audience IN ('author', 'external')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_bindings_unique
  ON channel_bindings(channel, external_contact_id);

CREATE INDEX IF NOT EXISTS idx_channel_bindings_user
  ON channel_bindings(user_id, created_at DESC);

COMMENT ON TABLE channel_bindings IS 'Maps channel external contacts to user and privacy defaults';
