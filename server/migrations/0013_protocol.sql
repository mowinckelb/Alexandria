-- The Alexandria protocol — incompressible core.
-- Two data pools: Library (files) and Marketplace (calls).

CREATE TABLE IF NOT EXISTS protocol_files (
  account_id TEXT PRIMARY KEY,
  text TEXT,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS protocol_calls (
  module_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  time TEXT NOT NULL,
  text TEXT
);

CREATE INDEX IF NOT EXISTS idx_pcalls_module ON protocol_calls(module_id);
CREATE INDEX IF NOT EXISTS idx_pcalls_account ON protocol_calls(account_id);
