-- Billing tab idempotency key: one row per accessor/author/artifact/month.
-- Prevents repeated reads of the same paid artifact from creating duplicate tab charges.

ALTER TABLE billing_tab ADD COLUMN artifact_id TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_tab_artifact_month
  ON billing_tab(accessor_id, author_id, artifact_type, artifact_id, month, settled);
