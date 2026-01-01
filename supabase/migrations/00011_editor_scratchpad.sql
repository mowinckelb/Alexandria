-- Editor Scratchpad: Freeform working memory for the Unified Editor
-- One row per user, updated in place as Editor processes Carbon

CREATE TABLE IF NOT EXISTS editor_scratchpad (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,  -- One scratchpad per user
  
  -- Freeform content - Editor can write anything here
  content text NOT NULL DEFAULT '',
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS editor_scratchpad_user_idx ON editor_scratchpad(user_id);

-- Function to get or create scratchpad for a user
CREATE OR REPLACE FUNCTION get_editor_scratchpad(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try to insert a new scratchpad, do nothing if exists
  INSERT INTO editor_scratchpad (user_id, content)
  VALUES (p_user_id, '')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Return the scratchpad
  RETURN QUERY
  SELECT es.id, es.content, es.updated_at
  FROM editor_scratchpad es
  WHERE es.user_id = p_user_id;
END;
$$;

-- Function to update scratchpad content
CREATE OR REPLACE FUNCTION update_editor_scratchpad(p_user_id uuid, p_content text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO editor_scratchpad (user_id, content, updated_at)
  VALUES (p_user_id, p_content, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    content = p_content,
    updated_at = now();
END;
$$;

-- Add category field to editor_notes for critical/non_critical distinction
ALTER TABLE editor_notes 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'non_critical' 
CHECK (category IN ('critical', 'non_critical'));

-- Create index for category-based queries
CREATE INDEX IF NOT EXISTS editor_notes_category_idx ON editor_notes(user_id, category)
WHERE status = 'pending';

