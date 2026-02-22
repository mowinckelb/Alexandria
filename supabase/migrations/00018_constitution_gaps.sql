-- Phase C: Constitutional RLAIF Flywheel
-- Tracks Constitution coverage gaps for targeted prompt generation

CREATE TABLE IF NOT EXISTS constitution_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  section TEXT NOT NULL
    CHECK (section IN ('worldview', 'values', 'models', 'identity', 'shadows')),
  subsection TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  training_pair_count INTEGER NOT NULL DEFAULT 0,
  avg_quality_score DOUBLE PRECISION,
  last_evaluated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_constitution_gaps_user_section
  ON constitution_gaps(user_id, section, priority);

CREATE INDEX IF NOT EXISTS idx_constitution_gaps_user_created
  ON constitution_gaps(user_id, created_at DESC);

COMMENT ON TABLE constitution_gaps IS 'Coverage gaps across Constitution sections used to drive targeted RLAIF';
