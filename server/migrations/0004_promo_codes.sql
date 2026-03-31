CREATE TABLE promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_id TEXT,
  discount_pct INTEGER NOT NULL DEFAULT 100,
  uses_remaining INTEGER DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_promo_code ON promo_codes(code);
CREATE INDEX idx_promo_author ON promo_codes(author_id);
