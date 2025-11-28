-- Editor Notes: The Editor's working memory
-- Stores questions, observations, mental models, and gaps identified during processing

CREATE TABLE IF NOT EXISTS editor_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  
  -- Note type
  type text NOT NULL CHECK (type IN ('question', 'observation', 'mental_model', 'gap')),
  
  -- Content
  content text NOT NULL,           -- The actual note/question
  context text,                    -- What prompted this (quote or summary)
  topic text,                      -- Topic category (family, work, beliefs, etc.)
  
  -- Priority and status
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'asked', 'resolved', 'dismissed')),
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  asked_at timestamp with time zone,
  resolved_at timestamp with time zone,
  
  -- Resolution
  resolution text,                 -- How it was resolved (answer summary)
  source_entry_id uuid             -- Which entry prompted this note
);

CREATE INDEX IF NOT EXISTS editor_notes_user_idx ON editor_notes(user_id);
CREATE INDEX IF NOT EXISTS editor_notes_pending_idx ON editor_notes(user_id, status, priority) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS editor_notes_type_idx ON editor_notes(user_id, type);

-- Function to get pending questions for a user, ordered by priority
CREATE OR REPLACE FUNCTION get_pending_questions(p_user_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  content text,
  context text,
  topic text,
  priority text
)
LANGUAGE sql STABLE
AS $$
  SELECT id, content, context, topic, priority
  FROM editor_notes
  WHERE user_id = p_user_id 
    AND status = 'pending'
    AND type = 'question'
  ORDER BY 
    CASE priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
    END,
    created_at ASC
  LIMIT p_limit;
$$;

-- Function to get editor stats for a user
CREATE OR REPLACE FUNCTION get_editor_notes_stats(p_user_id uuid)
RETURNS TABLE (
  total_notes bigint,
  pending_questions bigint,
  pending_gaps bigint,
  observations bigint,
  mental_models bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    COUNT(*) as total_notes,
    COUNT(*) FILTER (WHERE type = 'question' AND status = 'pending') as pending_questions,
    COUNT(*) FILTER (WHERE type = 'gap' AND status = 'pending') as pending_gaps,
    COUNT(*) FILTER (WHERE type = 'observation') as observations,
    COUNT(*) FILTER (WHERE type = 'mental_model') as mental_models
  FROM editor_notes
  WHERE user_id = p_user_id;
$$;
