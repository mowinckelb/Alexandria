-- RLHF Feedback Enhancement
-- Extends feedback_logs for DPO and reward model training

-- Drop old constraint and modify feedback_logs
ALTER TABLE feedback_logs 
DROP CONSTRAINT IF EXISTS feedback_logs_feedback_check;

-- Update feedback to support -2 to +2 scale
ALTER TABLE feedback_logs 
ALTER COLUMN feedback TYPE smallint,
ADD CONSTRAINT feedback_logs_feedback_check CHECK (feedback BETWEEN -2 AND 2);

-- Add columns for richer feedback
ALTER TABLE feedback_logs 
ADD COLUMN IF NOT EXISTS comment text,
ADD COLUMN IF NOT EXISTS prompt text,           -- The user query that generated this response
ADD COLUMN IF NOT EXISTS response text,         -- The assistant response being rated
ADD COLUMN IF NOT EXISTS model_id text,         -- Which model generated this response
ADD COLUMN IF NOT EXISTS session_id uuid,       -- Link to chat session
ADD COLUMN IF NOT EXISTS used_for_training uuid REFERENCES training_exports(id);  -- Lineage tracking

-- Add index for training data export
CREATE INDEX IF NOT EXISTS feedback_logs_user_idx ON feedback_logs(user_id);
CREATE INDEX IF NOT EXISTS feedback_logs_unused_idx ON feedback_logs(user_id, feedback) 
  WHERE used_for_training IS NULL;
CREATE INDEX IF NOT EXISTS feedback_logs_quality_idx ON feedback_logs(user_id, feedback DESC) 
  WHERE used_for_training IS NULL;

-- ===========================================
-- DPO PREFERENCE PAIRS
-- Stores chosen/rejected pairs for DPO training
-- ===========================================
CREATE TABLE IF NOT EXISTS preference_pairs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prompt text NOT NULL,              -- The input that generated both responses
  chosen_response text NOT NULL,     -- The preferred response (higher rating)
  rejected_response text NOT NULL,   -- The less preferred response (lower rating)
  chosen_feedback_id uuid REFERENCES feedback_logs(id),
  rejected_feedback_id uuid REFERENCES feedback_logs(id),
  margin int NOT NULL,               -- Rating difference (strength of preference)
  export_id uuid REFERENCES training_exports(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS preference_pairs_user_idx ON preference_pairs(user_id);
CREATE INDEX IF NOT EXISTS preference_pairs_unexported_idx ON preference_pairs(user_id) 
  WHERE export_id IS NULL;

-- ===========================================
-- REWARD MODEL TRAINING DATA
-- For training a reward model (RLHF approach)
-- ===========================================
CREATE TABLE IF NOT EXISTS reward_training_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  reward float NOT NULL,             -- Normalized reward signal (-1 to 1)
  feedback_id uuid REFERENCES feedback_logs(id),
  export_id uuid REFERENCES training_exports(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS reward_training_user_idx ON reward_training_data(user_id);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Generate DPO pairs from feedback data
-- Finds responses to the same/similar prompts with different ratings
CREATE OR REPLACE FUNCTION generate_preference_pairs(p_user_id uuid, min_margin int DEFAULT 2)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  pairs_created int := 0;
BEGIN
  -- Insert preference pairs where we have different ratings for similar prompts
  INSERT INTO preference_pairs (user_id, prompt, chosen_response, rejected_response, chosen_feedback_id, rejected_feedback_id, margin)
  SELECT DISTINCT ON (f1.prompt, f2.id)
    p_user_id,
    f1.prompt,
    f1.response AS chosen_response,
    f2.response AS rejected_response,
    f1.id AS chosen_feedback_id,
    f2.id AS rejected_feedback_id,
    f1.feedback - f2.feedback AS margin
  FROM feedback_logs f1
  JOIN feedback_logs f2 ON f1.user_id = f2.user_id 
    AND f1.prompt = f2.prompt 
    AND f1.feedback > f2.feedback
    AND f1.id != f2.id
  WHERE f1.user_id = p_user_id
    AND f1.feedback - f2.feedback >= min_margin
    AND NOT EXISTS (
      SELECT 1 FROM preference_pairs pp 
      WHERE pp.chosen_feedback_id = f1.id AND pp.rejected_feedback_id = f2.id
    );
  
  GET DIAGNOSTICS pairs_created = ROW_COUNT;
  RETURN pairs_created;
END;
$$;

-- Export feedback as normalized reward training data
CREATE OR REPLACE FUNCTION generate_reward_data(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  rows_created int := 0;
BEGIN
  -- Convert -2 to +2 scale to -1 to 1 reward signal
  INSERT INTO reward_training_data (user_id, prompt, response, reward, feedback_id)
  SELECT 
    user_id,
    prompt,
    response,
    feedback::float / 2.0 AS reward,  -- Normalize to -1 to 1
    id AS feedback_id
  FROM feedback_logs
  WHERE user_id = p_user_id
    AND prompt IS NOT NULL
    AND response IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM reward_training_data rtd WHERE rtd.feedback_id = feedback_logs.id
    );
  
  GET DIAGNOSTICS rows_created = ROW_COUNT;
  RETURN rows_created;
END;
$$;

