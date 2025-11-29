-- Enhanced memory recall with importance and recency data
-- Returns all fields needed for weighted ranking

CREATE OR REPLACE FUNCTION match_memory_enhanced (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text, 
  similarity float,
  importance float,
  created_at timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    id,
    content, 
    1 - (embedding <=> query_embedding) AS similarity,
    importance,
    created_at
  FROM memory_fragments
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  AND user_id = p_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
