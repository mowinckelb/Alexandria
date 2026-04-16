-- Billing integrity + webhook dedupe hardening.
-- 1) Enforce one unsettled tab charge per accessor/author/artifact/month.
-- 2) Add atomic webhook idempotency table for Stripe event IDs.

-- Remove duplicate unsettled artifact rows before adding uniqueness.
DELETE FROM billing_tab
WHERE settled = 0
  AND artifact_id != ''
  AND id NOT IN (
    SELECT MIN(id)
    FROM billing_tab
    WHERE settled = 0
      AND artifact_id != ''
    GROUP BY accessor_id, author_id, artifact_type, artifact_id, month
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_unique_unsettled_artifact
  ON billing_tab(accessor_id, author_id, artifact_type, artifact_id, month)
  WHERE settled = 0 AND artifact_id != '';

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events(processed_at);
