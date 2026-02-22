-- Phase C Tier 2: richer constitution gap scoring metrics

ALTER TABLE constitution_gaps
  ADD COLUMN IF NOT EXISTS gap_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evidence_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_constitution_gaps_user_score
  ON constitution_gaps(user_id, gap_score DESC, priority);
