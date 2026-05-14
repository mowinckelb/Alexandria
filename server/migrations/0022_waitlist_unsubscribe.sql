-- Add unsubscribe token + opt-out timestamp to waitlist so follower
-- emails can carry List-Unsubscribe and the /email/stop endpoint can
-- process follower opt-outs.
ALTER TABLE waitlist ADD COLUMN unsubscribe_token TEXT;
ALTER TABLE waitlist ADD COLUMN opted_out_at TEXT;
CREATE INDEX IF NOT EXISTS idx_waitlist_unsubscribe_token ON waitlist(unsubscribe_token);
