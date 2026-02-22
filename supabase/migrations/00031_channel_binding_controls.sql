-- Phase E production controls for channel bindings

ALTER TABLE channel_bindings
  ADD COLUMN IF NOT EXISTS max_messages_per_flush INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS min_interval_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_channel_bindings_pause
  ON channel_bindings(is_active, paused_until);
