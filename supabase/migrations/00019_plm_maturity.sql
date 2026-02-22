-- Phase C: Constitutional RLAIF Flywheel
-- Tracks disaggregated PLM maturity for dynamic routing and weighting

CREATE TABLE IF NOT EXISTS plm_maturity (
  user_id UUID PRIMARY KEY,
  overall_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  domain_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_pair_count INTEGER NOT NULL DEFAULT 0,
  rlaif_evaluation_count INTEGER NOT NULL DEFAULT 0,
  last_training_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plm_maturity_updated
  ON plm_maturity(updated_at DESC);

COMMENT ON TABLE plm_maturity IS 'Disaggregated PLM maturity signals used by Orchestrator weighting';
