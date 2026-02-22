-- Phase H: Payment foundations
-- Tracks user expenses and income events for transparent ledger views

CREATE TABLE IF NOT EXISTS user_expense_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('llm_api', 'training', 'storage', 'other')),
  amount_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  source_ref TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_income_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('persona_api', 'library', 'other')),
  amount_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  source_ref TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_expense_ledger_user_created
  ON user_expense_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_income_ledger_user_created
  ON user_income_ledger(user_id, created_at DESC);

COMMENT ON TABLE user_expense_ledger IS 'User-facing expense events for transparent monthly cost accounting';
COMMENT ON TABLE user_income_ledger IS 'User-facing income events from Persona/API activity';
