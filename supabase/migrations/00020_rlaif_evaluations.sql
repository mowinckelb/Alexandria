-- Phase C: Constitutional RLAIF Flywheel
-- Stores evaluator outputs and review-routing decisions

CREATE TABLE IF NOT EXISTS rlaif_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  plm_response TEXT NOT NULL,
  constitution_section TEXT NOT NULL
    CHECK (constitution_section IN ('worldview', 'values', 'models', 'identity', 'shadows')),
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  routing TEXT NOT NULL
    CHECK (routing IN ('auto_approved', 'author_review', 'flagged')),
  reviewer_comment TEXT,
  author_verdict TEXT
    CHECK (author_verdict IN ('approved', 'rejected', 'edited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rlaif_evaluations_user_routing
  ON rlaif_evaluations(user_id, routing, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rlaif_evaluations_user_review
  ON rlaif_evaluations(user_id, author_verdict, reviewed_at DESC);

COMMENT ON TABLE rlaif_evaluations IS 'Constitution-grounded evaluator outputs and author review state';
