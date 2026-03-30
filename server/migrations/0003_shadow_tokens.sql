CREATE TABLE shadow_tokens (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  buyer_email TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  access_count INTEGER DEFAULT 0
);
CREATE INDEX idx_shadow_tokens_token ON shadow_tokens(token);
CREATE INDEX idx_shadow_tokens_author ON shadow_tokens(author_id);
