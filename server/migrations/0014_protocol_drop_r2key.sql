-- Drop r2_key from protocol_files — it's derived from account_id, redundant state.
-- D1/SQLite doesn't support DROP COLUMN directly. Recreate the table.

CREATE TABLE IF NOT EXISTS protocol_files_v2 (
  account_id TEXT PRIMARY KEY,
  text TEXT,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO protocol_files_v2 (account_id, text, published_at, updated_at)
  SELECT account_id, text, published_at, updated_at FROM protocol_files;

DROP TABLE IF EXISTS protocol_files;
ALTER TABLE protocol_files_v2 RENAME TO protocol_files;
