-- Phase 1: Formalize Constitution
-- Creates tables for versioned Constitution storage

-- ============================================================================
-- Constitutions Table
-- Stores all versions of user Constitutions
-- ============================================================================

CREATE TABLE IF NOT EXISTS constitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,  -- Full markdown
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Parsed sections for querying
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT,
  previous_version_id UUID REFERENCES constitutions(id)
);

-- Unique constraint on user_id + version
CREATE UNIQUE INDEX IF NOT EXISTS idx_constitutions_user_version 
  ON constitutions(user_id, version);

-- Index for fetching latest versions
CREATE INDEX IF NOT EXISTS idx_constitutions_user_created 
  ON constitutions(user_id, created_at DESC);

-- ============================================================================
-- Active Constitutions Table
-- Points to the currently active Constitution for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS active_constitutions (
  user_id UUID PRIMARY KEY,
  constitution_id UUID NOT NULL REFERENCES constitutions(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get the active Constitution for a user
CREATE OR REPLACE FUNCTION get_active_constitution(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  version INTEGER,
  content TEXT,
  sections JSONB,
  created_at TIMESTAMPTZ,
  change_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.version,
    c.content,
    c.sections,
    c.created_at,
    c.change_summary
  FROM constitutions c
  INNER JOIN active_constitutions ac ON c.id = ac.constitution_id
  WHERE ac.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get Constitution version history for a user
CREATE OR REPLACE FUNCTION get_constitution_history(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  version INTEGER,
  change_summary TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.version,
    c.change_summary,
    c.created_at,
    (ac.constitution_id IS NOT NULL) AS is_active
  FROM constitutions c
  LEFT JOIN active_constitutions ac ON c.id = ac.constitution_id AND ac.user_id = p_user_id
  WHERE c.user_id = p_user_id
  ORDER BY c.version DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create or update active Constitution
CREATE OR REPLACE FUNCTION set_active_constitution(
  p_user_id UUID,
  p_constitution_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO active_constitutions (user_id, constitution_id, updated_at)
  VALUES (p_user_id, p_constitution_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    constitution_id = p_constitution_id,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get next version number for a user
CREATE OR REPLACE FUNCTION get_next_constitution_version(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM constitutions
  WHERE user_id = p_user_id;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE constitutions IS 'Versioned storage of user Constitutions (explicit worldview documents)';
COMMENT ON TABLE active_constitutions IS 'Points to the currently active Constitution for each user';
COMMENT ON COLUMN constitutions.content IS 'Full Constitution as markdown text';
COMMENT ON COLUMN constitutions.sections IS 'Parsed sections as JSONB for structured queries';
COMMENT ON COLUMN constitutions.change_summary IS 'Description of what changed in this version';
