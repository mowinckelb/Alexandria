-- Enable Vector Extension
create extension if not exists vector;

-- 1. Entries (Raw Carbon)
create table entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  source text default 'manual', 
  metadata jsonb default '{}'::jsonb, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Memory Fragments (Objective Data + Stealth Graph)
create table memory_fragments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  embedding vector(768), 
  entities jsonb default '[]'::jsonb, -- Graph Nodes stored for later
  importance float default 0.5,       
  metadata jsonb default '{}'::jsonb, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index on memory_fragments using hnsw (embedding vector_cosine_ops);

-- 3. Ghosts (Subjective Twins)
create table twins (
  user_id uuid references auth.users primary key,
  model_id text,
  training_job_id text,
  status text default 'idle',
  last_trained_at timestamp with time zone
);

-- 4. Chat History (Memory)
create table chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Match Function
create or replace function match_memory (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  content text,
  similarity float
)
language sql stable
as $$
  select
    content,
    1 - (embedding <=> query_embedding) as similarity
  from memory_fragments
  where 1 - (embedding <=> query_embedding) > match_threshold
  and user_id = p_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;