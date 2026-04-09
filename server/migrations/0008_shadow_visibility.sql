-- Shadow visibility model: public/authors/invite replaces free/paid/private
-- At least one shadow per Author must be public or authors (enforced in app code)

CREATE TABLE shadows_new (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'authors', 'invite')),
  price_cents INTEGER DEFAULT 0,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Migrate: free → public (price 0), paid → authors (keep author's price from settings), private → invite
INSERT INTO shadows_new (id, author_id, visibility, price_cents, r2_key, size_bytes, published_at, updated_at)
SELECT id, author_id,
  CASE tier
    WHEN 'free' THEN 'public'
    WHEN 'paid' THEN 'authors'
    WHEN 'private' THEN 'invite'
    ELSE 'public'
  END,
  CASE tier WHEN 'paid' THEN 200 ELSE 0 END,
  r2_key, size_bytes, published_at, updated_at
FROM shadows;

DROP TABLE shadows;
ALTER TABLE shadows_new RENAME TO shadows;
CREATE INDEX idx_shadows_author ON shadows(author_id);
