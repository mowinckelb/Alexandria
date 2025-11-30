-- Dynamic Editor Notes: Reflective questioning system
-- Editor continuously evaluates all info and self-resolves when possible

-- Add category (critical vs non-critical) and related evidence
ALTER TABLE editor_notes 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'non_critical' 
    CHECK (category IN ('critical', 'non_critical'));

ALTER TABLE editor_notes 
  ADD COLUMN IF NOT EXISTS related_evidence jsonb DEFAULT '[]'::jsonb;

-- Index for efficient category-based queries
CREATE INDEX IF NOT EXISTS editor_notes_category_idx 
  ON editor_notes(user_id, category, status) 
  WHERE status = 'pending';

-- Function to get all pending notes with full context for reflection
CREATE OR REPLACE FUNCTION get_notes_for_reflection(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  type text,
  content text,
  context text,
  topic text,
  priority text,
  category text,
  related_evidence jsonb,
  created_at timestamp with time zone
)
LANGUAGE sql STABLE
AS $$
  SELECT id, type, content, context, topic, priority, category, related_evidence, created_at
  FROM editor_notes
  WHERE user_id = p_user_id 
    AND status = 'pending'
  ORDER BY 
    CASE category WHEN 'critical' THEN 0 ELSE 1 END,
    CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
    created_at ASC;
$$;

-- Function to get next question (critical first, then by priority)
CREATE OR REPLACE FUNCTION get_next_question_to_ask(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  context text,
  topic text,
  category text,
  related_evidence jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT id, content, context, topic, category, related_evidence
  FROM editor_notes
  WHERE user_id = p_user_id 
    AND status = 'pending'
    AND type = 'question'
  ORDER BY 
    CASE category WHEN 'critical' THEN 0 ELSE 1 END,
    CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
    created_at ASC
  LIMIT 1;
$$;

-- Update stats function to include category breakdown (must drop first to change return type)
DROP FUNCTION IF EXISTS get_editor_notes_stats(uuid);
CREATE OR REPLACE FUNCTION get_editor_notes_stats(p_user_id uuid)
RETURNS TABLE (
  total_notes bigint,
  pending_questions bigint,
  pending_gaps bigint,
  observations bigint,
  mental_models bigint,
  critical_pending bigint,
  non_critical_pending bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    COUNT(*) as total_notes,
    COUNT(*) FILTER (WHERE type = 'question' AND status = 'pending') as pending_questions,
    COUNT(*) FILTER (WHERE type = 'gap' AND status = 'pending') as pending_gaps,
    COUNT(*) FILTER (WHERE type = 'observation') as observations,
    COUNT(*) FILTER (WHERE type = 'mental_model') as mental_models,
    COUNT(*) FILTER (WHERE category = 'critical' AND status = 'pending') as critical_pending,
    COUNT(*) FILTER (WHERE category = 'non_critical' AND status = 'pending') as non_critical_pending
  FROM editor_notes
  WHERE user_id = p_user_id;
$$;
