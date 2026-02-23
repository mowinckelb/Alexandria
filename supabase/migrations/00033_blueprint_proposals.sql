-- Blueprint proposal valve (Engine -> Blueprint loop)
-- Captures runtime friction and suggested config/code changes.

CREATE TABLE IF NOT EXISTS blueprint_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'engine',
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('config', 'prompt', 'policy', 'code')),
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
  impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'reviewing', 'accepted', 'rejected', 'applied')),
  reviewed_by TEXT,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprint_proposals_user_status
  ON blueprint_proposals(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blueprint_proposals_type
  ON blueprint_proposals(proposal_type, created_at DESC);

COMMENT ON TABLE blueprint_proposals IS 'Engine-to-Blueprint proposals for slow-loop review and evolution';
