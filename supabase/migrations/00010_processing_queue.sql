-- Processing queue for async large file handling
CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  
  -- File info
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  context text,
  
  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress int DEFAULT 0, -- 0-100
  error text,
  
  -- Results (populated on completion)
  result jsonb,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS processing_jobs_user_idx ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS processing_jobs_status_idx ON processing_jobs(status, created_at);

-- Function to get pending jobs (oldest first)
CREATE OR REPLACE FUNCTION get_next_pending_job()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  storage_path text,
  file_name text,
  file_type text,
  file_size bigint,
  context text
)
LANGUAGE sql
AS $$
  UPDATE processing_jobs
  SET status = 'processing', started_at = timezone('utc'::text, now())
  WHERE id = (
    SELECT id FROM processing_jobs 
    WHERE status = 'pending' 
    ORDER BY created_at ASC 
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, user_id, storage_path, file_name, file_type, file_size, context;
$$;

-- Function to get user's recent jobs
CREATE OR REPLACE FUNCTION get_user_jobs(p_user_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_size bigint,
  status text,
  progress int,
  error text,
  created_at timestamp with time zone,
  completed_at timestamp with time zone
)
LANGUAGE sql STABLE
AS $$
  SELECT id, file_name, file_size, status, progress, error, created_at, completed_at
  FROM processing_jobs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;
