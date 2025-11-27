-- Update feedback constraint from -2/+2 scale to binary -1/+1
-- Binary is cleaner signal, less decision fatigue for Author

-- Drop old constraint
ALTER TABLE feedback_logs 
DROP CONSTRAINT IF EXISTS feedback_logs_feedback_check;

-- Add new binary constraint
ALTER TABLE feedback_logs 
ADD CONSTRAINT feedback_logs_feedback_check CHECK (feedback IN (-1, 1));

-- Update the generate_preference_pairs function to use binary margin
-- With binary feedback, margin is always 2 (from -1 to +1)
CREATE OR REPLACE FUNCTION generate_preference_pairs(p_user_id uuid, min_margin int DEFAULT 1)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  pairs_created int := 0;
BEGIN
  -- Insert preference pairs where we have different ratings for similar prompts
  -- With binary feedback: good (+1) vs bad (-1) = margin of 2
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

-- Update generate_reward_data to use binary normalization
CREATE OR REPLACE FUNCTION generate_reward_data(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  rows_created int := 0;
BEGIN
  -- Binary feedback: -1→-0.5, +1→+0.5
  INSERT INTO reward_training_data (user_id, prompt, response, reward, feedback_id)
  SELECT 
    user_id,
    prompt,
    response,
    feedback::float * 0.5 AS reward,  -- Binary: -1→-0.5, +1→0.5
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

-- Note: Existing data with -2, 0, or +2 values will violate the new constraint
-- Run this to fix existing data before applying constraint:
-- UPDATE feedback_logs SET feedback = CASE WHEN feedback >= 0 THEN 1 ELSE -1 END WHERE feedback NOT IN (-1, 1);

