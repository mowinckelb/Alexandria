CREATE TABLE waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'author',
  source TEXT NOT NULL DEFAULT 'public',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_waitlist_email ON waitlist(email);
