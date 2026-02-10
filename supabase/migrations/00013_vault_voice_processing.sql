-- Phase 0: Voice Notes Bootstrap
-- Creates vault_files table and extends processing_jobs for batch processing

-- ============================================================================
-- Vault Files Table
-- Track files stored in Supabase Storage (Vault)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  path TEXT NOT NULL,  -- e.g., 'raw/voice/2026-02-10-note.m4a'
  file_type TEXT NOT NULL,  -- 'audio', 'document', 'constitution', 'transcript'
  original_name TEXT,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on user_id + path
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_files_user_path ON vault_files(user_id, path);

-- Index for listing files by type
CREATE INDEX IF NOT EXISTS idx_vault_files_user_type ON vault_files(user_id, file_type);

-- ============================================================================
-- Extend Processing Jobs for Batch Processing
-- Add columns needed for voice bootstrap batch jobs
-- ============================================================================

-- Add job_type column if it doesn't exist (for categorizing jobs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN job_type TEXT DEFAULT 'single_file';
  END IF;
END $$;

-- Add total_items column for batch progress tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'total_items'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN total_items INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add processed_items column for batch progress tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'processed_items'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN processed_items INTEGER DEFAULT 0;
  END IF;
END $$;

-- Rename 'result' to 'results' if needed (for consistency), or add 'results' if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'results'
  ) THEN
    -- Check if 'result' exists (from 00010)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'processing_jobs' AND column_name = 'result'
    ) THEN
      ALTER TABLE processing_jobs RENAME COLUMN result TO results;
    ELSE
      ALTER TABLE processing_jobs ADD COLUMN results JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- Update status check constraint to include new statuses
ALTER TABLE processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_status_check;
ALTER TABLE processing_jobs ADD CONSTRAINT processing_jobs_status_check 
  CHECK (status IN ('pending', 'processing', 'running', 'completed', 'partial', 'failed', 'cancelled'));

-- Index for finding jobs by type
CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(job_type);

-- ============================================================================
-- Helper function to update batch job progress
-- ============================================================================

CREATE OR REPLACE FUNCTION update_job_progress(
  p_job_id UUID,
  p_processed INTEGER,
  p_results JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE processing_jobs
  SET 
    processed_items = p_processed,
    results = COALESCE(p_results, results),
    status = CASE 
      WHEN p_processed >= total_items THEN 'completed'
      ELSE 'running'
    END,
    completed_at = CASE 
      WHEN p_processed >= total_items THEN NOW()
      ELSE NULL
    END
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper function to fail a job
-- ============================================================================

CREATE OR REPLACE FUNCTION fail_job(
  p_job_id UUID,
  p_error TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE processing_jobs
  SET 
    status = 'failed',
    error = p_error,
    completed_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE vault_files IS 'Tracks files stored in Supabase Storage (Vault) for data sovereignty';
COMMENT ON COLUMN vault_files.path IS 'Path within user vault, e.g., raw/voice/filename.m4a';
COMMENT ON COLUMN processing_jobs.job_type IS 'Type of job: single_file, voice_bootstrap, constitution_extract, bulk_ingest';
