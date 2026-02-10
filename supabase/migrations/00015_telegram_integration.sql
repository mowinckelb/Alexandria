-- Phase 2: Telegram Integration
-- Tables for Telegram user mapping and message history

-- ============================================================================
-- Alexandria Users Table (if not exists)
-- Simple user management for Telegram-based access
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Telegram Users Mapping
-- Links Telegram user IDs to Alexandria user IDs
-- ============================================================================

CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  autonomy_level TEXT DEFAULT 'conservative' CHECK (autonomy_level IN ('conservative', 'balanced', 'autonomous')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by Telegram ID
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);

-- Index for finding Alexandria user
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);

-- ============================================================================
-- Telegram Messages
-- Conversation history for context
-- ============================================================================

CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('editor', 'orchestrator')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching conversation history
CREATE INDEX IF NOT EXISTS idx_telegram_messages_user_mode ON telegram_messages(user_id, mode, created_at DESC);

-- Limit stored messages per user (cleanup old ones)
CREATE OR REPLACE FUNCTION cleanup_old_telegram_messages()
RETURNS trigger AS $$
BEGIN
  -- Keep only last 1000 messages per user per mode
  DELETE FROM telegram_messages
  WHERE id IN (
    SELECT id FROM telegram_messages
    WHERE user_id = NEW.user_id AND mode = NEW.mode
    ORDER BY created_at DESC
    OFFSET 1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup on insert
DROP TRIGGER IF EXISTS telegram_messages_cleanup ON telegram_messages;
CREATE TRIGGER telegram_messages_cleanup
AFTER INSERT ON telegram_messages
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_telegram_messages();

-- ============================================================================
-- Pending Confirmations
-- For autonomy level "notify + proceed" and "notify + wait"
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  autonomy_level TEXT NOT NULL CHECK (autonomy_level IN ('notify_proceed', 'notify_wait')),
  timeout_at TIMESTAMPTZ,  -- When to auto-proceed (for notify_proceed)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired', 'executed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Index for finding pending confirmations
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user ON pending_confirmations(user_id, status);

-- Index for timeout processing
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_timeout ON pending_confirmations(timeout_at)
WHERE status = 'pending';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE telegram_users IS 'Maps Telegram user IDs to Alexandria users';
COMMENT ON TABLE telegram_messages IS 'Conversation history for Telegram interactions';
COMMENT ON TABLE pending_confirmations IS 'Actions awaiting user confirmation based on autonomy level';
COMMENT ON COLUMN telegram_users.autonomy_level IS 'User preference: conservative (always ask), balanced (reversible auto), autonomous (all auto)';
