-- RLAIF: Synthetic Feedback Tracking
-- Tracks Editor-generated ratings of Ghost responses for training data multiplication

CREATE TABLE IF NOT EXISTS synthetic_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  
  -- The prompt/response being rated
  prompt text NOT NULL,
  response text NOT NULL,
  
  -- Editor's evaluation
  rating text NOT NULL CHECK (rating IN ('good', 'bad')),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reasoning text,
  uncertainties jsonb DEFAULT '[]'::jsonb,
  
  -- Source tracking
  prompt_source text CHECK (prompt_source IN ('corpus', 'editor_generated', 'gap_based')),
  
  -- Processing status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'auto_approved', 'queued_review', 'author_validated', 'rejected')),
  
  -- If converted to training pair
  training_pair_id uuid REFERENCES training_pairs(id),
  
  -- If queued for review, link to notepad question
  review_note_id uuid REFERENCES editor_notes(id),
  
  -- Author validation (if reviewed)
  author_validated_at timestamp with time zone,
  author_agreed boolean,  -- Did Author agree with Editor's rating?
  author_comment text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS synthetic_ratings_user_idx ON synthetic_ratings(user_id);
CREATE INDEX IF NOT EXISTS synthetic_ratings_status_idx ON synthetic_ratings(user_id, status);
CREATE INDEX IF NOT EXISTS synthetic_ratings_confidence_idx ON synthetic_ratings(user_id, confidence);

-- Function to get RLAIF stats for a user
CREATE OR REPLACE FUNCTION get_rlaif_stats(p_user_id uuid)
RETURNS TABLE (
  total_synthetic bigint,
  auto_approved bigint,
  queued_review bigint,
  author_validated bigint,
  author_agreement_rate numeric,
  by_confidence jsonb
)
LANGUAGE sql STABLE
AS $$
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'auto_approved') as approved,
      COUNT(*) FILTER (WHERE status = 'queued_review') as queued,
      COUNT(*) FILTER (WHERE status = 'author_validated') as validated,
      COUNT(*) FILTER (WHERE author_agreed = true) as agreed,
      COUNT(*) FILTER (WHERE author_validated_at IS NOT NULL) as reviewed
    FROM synthetic_ratings
    WHERE user_id = p_user_id
  ),
  confidence_stats AS (
    SELECT jsonb_build_object(
      'high', COUNT(*) FILTER (WHERE confidence = 'high'),
      'medium', COUNT(*) FILTER (WHERE confidence = 'medium'),
      'low', COUNT(*) FILTER (WHERE confidence = 'low')
    ) as by_conf
    FROM synthetic_ratings
    WHERE user_id = p_user_id
  )
  SELECT 
    stats.total,
    stats.approved,
    stats.queued,
    stats.validated,
    CASE WHEN stats.reviewed > 0 
      THEN ROUND((stats.agreed::numeric / stats.reviewed) * 100, 1)
      ELSE NULL 
    END as agreement_rate,
    confidence_stats.by_conf
  FROM stats, confidence_stats;
$$;

-- Function to get pending review items
CREATE OR REPLACE FUNCTION get_pending_rlaif_reviews(p_user_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  prompt text,
  response text,
  rating text,
  confidence text,
  reasoning text
)
LANGUAGE sql STABLE
AS $$
  SELECT id, prompt, response, rating, confidence, reasoning
  FROM synthetic_ratings
  WHERE user_id = p_user_id 
    AND status = 'queued_review'
  ORDER BY created_at ASC
  LIMIT p_limit;
$$;

