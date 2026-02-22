-- Phase D1: structured memory entities for graph-oriented retrieval

CREATE TABLE IF NOT EXISTS memory_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_fragment_id UUID NOT NULL REFERENCES memory_fragments(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (entity_type IN ('person', 'organization', 'location', 'concept', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_entities_user_name
  ON memory_entities(user_id, entity_name);

CREATE INDEX IF NOT EXISTS idx_memory_entities_fragment
  ON memory_entities(memory_fragment_id);

COMMENT ON TABLE memory_entities IS 'Extracted entities anchored to memory fragments for relationship expansion';
-- Phase D1: structured memory entities for graph-oriented retrieval

CREATE TABLE IF NOT EXISTS memory_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_fragment_id UUID NOT NULL REFERENCES memory_fragments(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (entity_type IN ('person', 'organization', 'location', 'concept', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_entities_user_name
  ON memory_entities(user_id, entity_name);

CREATE INDEX IF NOT EXISTS idx_memory_entities_fragment
  ON memory_entities(memory_fragment_id);

COMMENT ON TABLE memory_entities IS 'Extracted entities anchored to memory fragments for relationship expansion';
