-- Phase E bridge durability: unified channel message state

CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  external_contact_id TEXT NOT NULL,
  external_message_id TEXT,
  content TEXT NOT NULL,
  audience TEXT NOT NULL
    CHECK (audience IN ('author', 'external')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'acked')),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_messages_user_created
  ON channel_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_messages_status
  ON channel_messages(status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_messages_idempotency
  ON channel_messages(channel, external_contact_id, COALESCE(external_message_id, ''), direction);

COMMENT ON TABLE channel_messages IS 'Durable inbound/outbound channel message lifecycle state';
