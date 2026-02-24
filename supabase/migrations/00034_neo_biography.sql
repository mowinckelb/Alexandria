-- Neo-Biography: authored works and curated influences per ALEXANDRIA.md
-- "Each Persona has a Neo-Biography: a canvas. Not a profile page. Not a static biography."

-- Authored works: essays, poetry, film, photography, music, etc.
-- Once published, frozen (append-only per ALEXANDRIA.md)
CREATE TABLE IF NOT EXISTS authored_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  medium TEXT NOT NULL DEFAULT 'essay',
  summary TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  frozen BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authored_works_user ON authored_works(user_id);
CREATE INDEX IF NOT EXISTS idx_authored_works_published ON authored_works(published_at DESC);

-- Curated influences: books, videos, music, ideas that shaped the Author
CREATE TABLE IF NOT EXISTS curated_influences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  medium TEXT NOT NULL DEFAULT 'book',
  url TEXT,
  annotation TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curated_influences_user ON curated_influences(user_id);

-- Author profile: public-facing identity for the Library
CREATE TABLE IF NOT EXISTS author_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  handle TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  public_constitution_summary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
