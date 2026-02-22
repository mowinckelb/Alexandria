-- Phase D2 (foundation): inferred relationships between memory entities

CREATE TABLE IF NOT EXISTS memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_fragment_id UUID NOT NULL REFERENCES memory_fragments(id) ON DELETE CASCADE,
  source_entity TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'co_occurs'
    CHECK (relation_type IN ('co_occurs', 'mentioned_with', 'causes', 'supports', 'conflicts_with')),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_relationships_unique
  ON memory_relationships(user_id, memory_fragment_id, source_entity, target_entity, relation_type);

CREATE INDEX IF NOT EXISTS idx_memory_relationships_user_source
  ON memory_relationships(user_id, source_entity, relation_type);

CREATE INDEX IF NOT EXISTS idx_memory_relationships_user_target
  ON memory_relationships(user_id, target_entity, relation_type);

COMMENT ON TABLE memory_relationships IS 'Graph-ready inferred relationships from entity co-occurrence';
