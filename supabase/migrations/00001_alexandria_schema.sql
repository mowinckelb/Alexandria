-- Alexandria: Complete Schema
-- MVP-Terminal Optimal (as of Nov 2025)

-- ===========================================
-- EXTENSIONS
-- ===========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ===========================================
-- OBJECTIVE HEMISPHERE (Memory)
-- ===========================================

-- Raw Carbon input
CREATE TABLE IF NOT EXISTS entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  source text DEFAULT 'manual', 
  metadata jsonb DEFAULT '{}'::jsonb, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Vector chunks with stealth graph prep
CREATE TABLE IF NOT EXISTS memory_fragments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(768), 
  entities jsonb DEFAULT '[]'::jsonb,  -- Stealth: for future GraphRAG
  importance float DEFAULT 0.5,       
  metadata jsonb DEFAULT '{}'::jsonb, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS memory_fragments_embedding_idx 
ON memory_fragments USING hnsw (embedding vector_cosine_ops);

-- Vector similarity search
CREATE OR REPLACE FUNCTION match_memory (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (content text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT content, 1 - (embedding <=> query_embedding) AS similarity
  FROM memory_fragments
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  AND user_id = p_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ===========================================
-- SUBJECTIVE HEMISPHERE (Soul)
-- ===========================================

-- Current ghost model state
CREATE TABLE IF NOT EXISTS twins (
  user_id uuid PRIMARY KEY,
  model_id text,
  training_job_id text,
  status text DEFAULT 'idle',
  last_trained_at timestamp with time zone
);

-- Training batch tracking (for evolutionary fine-tuning)
CREATE TABLE IF NOT EXISTS training_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  training_job_id text,           -- Together AI job ID
  base_model_id text,             -- What we trained FROM
  resulting_model_id text,        -- What we got
  pair_count int NOT NULL,
  min_quality_threshold float DEFAULT 0,
  status text DEFAULT 'exported', -- exported → training → completed → active | failed
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS training_exports_user_idx ON training_exports(user_id);
CREATE INDEX IF NOT EXISTS training_exports_status_idx ON training_exports(user_id, status);

-- Individual training pairs (LoRA data)
CREATE TABLE IF NOT EXISTS training_pairs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  system_prompt text NOT NULL DEFAULT 'You are a digital ghost.',
  user_content text NOT NULL,
  assistant_content text NOT NULL,
  quality_score float DEFAULT 0.5,
  source_entry_id uuid,
  export_id uuid REFERENCES training_exports(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS training_pairs_user_idx ON training_pairs(user_id);
CREATE INDEX IF NOT EXISTS training_pairs_unexported_idx ON training_pairs(user_id) WHERE export_id IS NULL;
CREATE INDEX IF NOT EXISTS training_pairs_quality_idx ON training_pairs(user_id, quality_score DESC) WHERE export_id IS NULL;

-- Get current model in evolution chain
CREATE OR REPLACE FUNCTION get_active_model(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (SELECT resulting_model_id FROM training_exports 
     WHERE user_id = p_user_id AND status = 'active' 
     ORDER BY completed_at DESC LIMIT 1),
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
  );
$$;

-- ===========================================
-- CHAT & FEEDBACK
-- ===========================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLHF data for future DPO training
CREATE TABLE IF NOT EXISTS feedback_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message_id uuid,
  feedback smallint NOT NULL CHECK (feedback IN (-1, 1)),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

