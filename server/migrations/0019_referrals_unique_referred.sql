-- Enforce tree property on referrals: each user can be kin of at most one
-- referrer. The $8 structural ARPU floor depends on this — if one user could
-- satisfy multiple free-riders' kin quotas, the floor collapses toward $0.
--
-- Defensive dedup first (keep earliest row per referred user), then unique
-- index. INSERT in routes.ts already runs inside try/catch, so duplicate
-- attempts after this lands will log and no-op rather than break OAuth.
DELETE FROM referrals
WHERE referred_github_login IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id) FROM referrals
    WHERE referred_github_login IS NOT NULL
    GROUP BY referred_github_login
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_unique
  ON referrals(referred_github_login);
