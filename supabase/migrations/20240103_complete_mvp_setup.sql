-- Complete MVP Setup for Alexandria
-- Run this in Supabase SQL Editor to create all tables

-- 1. Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Entries (Raw Carbon) - NO FK to auth.users for MVP
CREATE TABLE IF NOT EXISTS entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,  -- No FK constraint for MVP
  content text NOT NULL,
  source text DEFAULT 'manual', 
  metadata jsonb DEFAULT '{}'::jsonb, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Memory Fragments (Objective Data + Stealth Graph)
CREATE TABLE IF NOT EXISTS memory_fragments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,  -- No FK constraint for MVP
  content text NOT NULL,
  embedding vector(768), 
  entities jsonb DEFAULT '[]'::jsonb,
  importance float DEFAULT 0.5,       
  metadata jsonb DEFAULT '{}'::jsonb, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS memory_fragments_embedding_idx 
ON memory_fragments USING hnsw (embedding vector_cosine_ops);

-- 4. Ghosts (Subjective Twins)
CREATE TABLE IF NOT EXISTS twins (
  user_id uuid PRIMARY KEY,  -- No FK constraint for MVP
  model_id text,
  training_job_id text,
  status text DEFAULT 'idle',
  last_trained_at timestamp with time zone
);

-- 5. Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,  -- No FK constraint for MVP
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 6. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid,  -- No FK constraint for MVP
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 7. Feedback Logs (RLHF Data for DPO Training)
CREATE TABLE IF NOT EXISTS feedback_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,  -- No FK constraint for MVP
  message_id uuid,  -- No FK constraint for MVP
  feedback smallint NOT NULL CHECK (feedback IN (-1, 1)),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 8. Vector Similarity Search Function
CREATE OR REPLACE FUNCTION match_memory (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM memory_fragments
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  AND user_id = p_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Done! Your Alexandria MVP database is ready.

