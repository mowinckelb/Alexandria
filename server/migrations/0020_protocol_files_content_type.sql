-- Protocol files: content_type as data, not code.
--
-- Previously the read path hard-coded `name === 'on-love'` to prefer the
-- .pdf extension over the .md placeholder. That doesn't generalise — every
-- new PDF would need a code change. Content type belongs on the row, not
-- in the routing logic.

ALTER TABLE protocol_files
  ADD COLUMN content_type TEXT NOT NULL DEFAULT 'text/markdown; charset=utf-8';

-- Backfill: every existing PUT wrote markdown; on-love is the one PDF we
-- have today (the .pdf was uploaded out-of-band; the .md is a placeholder).
UPDATE protocol_files
  SET content_type = 'application/pdf'
  WHERE name = 'on-love';
