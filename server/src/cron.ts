/** Cron jobs — health digest, followup, engagement. Called by worker scheduled handler. */

import { loadAccounts, saveAccounts, getKV, getRecentDaysEvents } from './kv.js';
import { sendEmail, sendEmailsBatched, sendFollowupEmail, sendEngagementEmail, MAX_FOLLOWUPS, DEFAULT_ENGAGEMENT_DAYS, FOUNDER_EMAIL } from './email.js';
import type { Account, AccountStore } from './auth.js';

// ---------------------------------------------------------------------------
// Follow-up check — nudge signed-up users who haven't installed
// ---------------------------------------------------------------------------

/** Run follow-up check — called by Cron Trigger */
export async function runFollowupCheck(): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const tasks: { key: string; account: Account; nextCount: number }[] = [];
  for (const [key, account] of Object.entries(accounts)) {
    if (account.installed_at || !account.email) continue;
    if (account.engagement_opt_out) continue;
    const count = account.followup_count || 0;
    if (count >= MAX_FOLLOWUPS) continue;
    if (new Date(account.created_at).getTime() > dayAgo) continue;
    tasks.push({ key, account, nextCount: count + 1 });
  }

  const { sent } = await sendEmailsBatched(tasks, async ({ key, account, nextCount }) => {
    try {
      await sendFollowupEmail(account.email, account.email_token, nextCount);
      accounts[key].followup_count = nextCount;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  if (sent > 0) await saveAccounts(accounts);

  // Cron execution marker — health digest verifies this exists
  try {
    const kv = getKV();
    await kv.put('cron:followup', JSON.stringify({
      t: new Date().toISOString(),
      followups_sent: sent,
    }), { expirationTtl: 30 * 24 * 60 * 60 });
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Engagement check — nudge installed users who go quiet
// ---------------------------------------------------------------------------

/** Run engagement check — called by Cron Trigger */
export async function runEngagementCheck(): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();
  const now = Date.now();

  const tasks: { key: string; account: Account }[] = [];
  for (const [key, account] of Object.entries(accounts)) {
    if (!account.installed_at || !account.email) continue;
    if (account.engagement_opt_out) continue;

    const intervalDays = account.engagement_interval_days || DEFAULT_ENGAGEMENT_DAYS;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    const lastActive = new Date(account.last_session || account.installed_at).getTime();
    if (now - lastActive < intervalMs) continue;

    // Skip if user recently received a morning brief — it serves the same purpose
    if (account.last_brief && now - new Date(account.last_brief).getTime() < intervalMs) continue;
    if (account.last_engagement_email && now - new Date(account.last_engagement_email).getTime() < intervalMs) continue;

    tasks.push({ key, account });
  }

  const { sent } = await sendEmailsBatched(tasks, async ({ key, account }) => {
    try {
      await sendEngagementEmail(account.email, account.email_token);
      accounts[key].last_engagement_email = new Date().toISOString();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  if (sent > 0) await saveAccounts(accounts);

  // Cron execution marker
  try {
    const kv = getKV();
    await kv.put('cron:engagement', JSON.stringify({
      t: new Date().toISOString(),
      engagement_sent: sent,
    }), { expirationTtl: 30 * 24 * 60 * 60 });
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Health digest — self-heal, only email the founder if he needs to log on
// ---------------------------------------------------------------------------

type Urgency = 'sprint' | 'stroll';

export async function runHealthDigest(): Promise<void> {
  try {
    const kv = getKV();
    const issues: string[] = [];
    let urgency: Urgency | null = null;
    const escalate = (u: Urgency, reason: string) => {
      issues.push(`[${u}] ${reason}`);
      if (!urgency || u === 'sprint') urgency = u;
    };

    // --- Self-healing probes ---

    // KV
    try {
      const page = await kv.list({ prefix: 'account:' });
      if (page.keys.length === 0) {
        escalate('sprint', 'KV: zero accounts');
      }
    } catch (e) {
      escalate('sprint', `KV read failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // D1
    try {
      const db = (globalThis as any).__d1 as D1Database | undefined;
      if (!db) {
        escalate('sprint', 'D1 not bound');
      } else {
        await db.prepare('SELECT 1').first();

        // Schema verification — expected tables must exist
        const expectedTables = ['authors', 'shadows', 'quizzes', 'works', 'quiz_results', 'referrals', 'access_log', 'billing_tab', 'waitlist', 'stripe_webhook_events', 'protocol_files', 'protocol_calls'];
        const { results: tables } = await db.prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table'`
        ).all<{ name: string }>();
        const tableNames = new Set((tables || []).map(t => t.name));
        const missing = expectedTables.filter(t => !tableNames.has(t));
        if (missing.length > 0) escalate('sprint', `D1 missing tables: ${missing.join(', ')}`);

        // Billing invariant: no duplicate unsettled rows for the same artifact-month key.
        const duplicateRows = await db.prepare(
          `SELECT COUNT(*) as c
           FROM (
             SELECT accessor_id, author_id, artifact_type, artifact_id, month
             FROM billing_tab
             WHERE settled = 0 AND artifact_id != ''
             GROUP BY accessor_id, author_id, artifact_type, artifact_id, month
             HAVING COUNT(*) > 1
           )`
        ).first<{ c: number }>();
        if ((duplicateRows?.c || 0) > 0) escalate('sprint', `D1 billing duplicate unsettled rows: ${duplicateRows?.c}`);

        // Verification substrate present.
        const billingIndex = await db.prepare(
          `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_tab_unique_unsettled_artifact'`
        ).first<{ name: string }>();
        if (!billingIndex) escalate('stroll', 'D1 missing billing uniqueness index');

        const webhookTable = await db.prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'stripe_webhook_events'`
        ).first<{ name: string }>();
        if (!webhookTable) escalate('stroll', 'D1 missing stripe_webhook_events table');
      }
    } catch (e) {
      escalate('sprint', `D1 probe failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // R2 — Library content storage
    try {
      const r2 = (globalThis as any).__r2 as R2Bucket | undefined;
      if (!r2) {
        escalate('sprint', 'R2 not bound — Library content inaccessible');
      } else {
        // head() returns null for missing keys, throws only on binding failure
        await r2.head('.health-probe');
      }
    } catch (e) {
      escalate('sprint', `R2 probe failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Canon now served from GitHub, not from this server. No KV cache to verify.

    // Event log analysis — scan today + yesterday (covers the 24h cutoff with
    // no arbitrary line-count ceiling; events:YYYY-MM-DD keys cap the read).
    // One pass, many counters. The awareness axiom: every line is a question.
    try {
      const raw = await getRecentDaysEvents(2);
      if (raw) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        let serverErrors = 0;
        let deprecatedHits = 0;
        let staleClientCalls = 0;
        const deprecatedByPath = new Map<string, number>();
        const clientVersions = new Map<string, number>();
        for (const line of raw.split('\n')) {
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (new Date(ev.t).getTime() < cutoff) continue;
            if (ev.e === 'server_error') serverErrors++;
            else if (ev.e === 'deprecated_hit') {
              deprecatedHits++;
              const p = ev.path || '(unknown)';
              deprecatedByPath.set(p, (deprecatedByPath.get(p) || 0) + 1);
            } else if (ev.e === 'client_version_seen') {
              const v = ev.version || 'unset';
              clientVersions.set(v, (clientVersions.get(v) || 0) + 1);
              if (v === 'unset') staleClientCalls++;
            }
          } catch { continue; }
        }
        if (serverErrors > 0) escalate('stroll', `${serverErrors} server errors in 24h`);
        if (deprecatedHits > 0) {
          const top = [...deprecatedByPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, n]) => `${p}=${n}`).join(', ');
          escalate('sprint', `${deprecatedHits} hits to deprecated routes in 24h (${top}) — stale installs`);
        }
        if (staleClientCalls > 0) {
          escalate('sprint', `${staleClientCalls} /call requests without X-Alexandria-Client header — pre-upgrade shims`);
        }
        if (clientVersions.size > 1) {
          const dist = [...clientVersions.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}=${n}`).join(', ');
          escalate('stroll', `client version drift: ${dist}`);
        }
      }
    } catch { /* non-fatal */ }

    // Route probes removed — Workers can't reliably self-fetch during cron (522 errors).
    // Infrastructure is verified directly above (KV, D1, R2, env vars).
    // External route verification is handled by GitHub Actions smoke test (every 6 hours).

    // Resend (email delivery)
    try {
      if (!process.env.RESEND_API_KEY) {
        escalate('stroll', 'RESEND_API_KEY not set — email delivery broken');
      }
    } catch { /* non-fatal */ }

    // Env var completeness
    try {
      const required = ['ENCRYPTION_KEY', 'STRIPE_WEBHOOK_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'];
      const missing = required.filter(k => !process.env[k]);
      if (missing.length > 0) escalate('sprint', `Missing env vars: ${missing.join(', ')}`);
    } catch { /* non-fatal */ }

    // Factory autoloop liveness — two markers: fired (JOB 0) + completed (end of JOB 4).
    // Fired stale → trigger dead. Completed stale while fired fresh → JOB 4 silently broken.
    try {
      // Soft default — owned by Factory autoloop (see factory/skills/factory.md). Reconsiderable.
      const factoryStaleDays = 14;
      const staleMs = factoryStaleDays * 24 * 60 * 60 * 1000;
      const markerAgeMs = async (key: string): Promise<number | null> => {
        const raw = await kv.get(key);
        if (!raw) return null;
        return Date.now() - new Date(JSON.parse(raw).t).getTime();
      };

      const firedAge = await markerAgeMs('cron:factory_autoloop');
      if (firedAge === null) {
        escalate('stroll', 'Factory autoloop: no fired marker yet — never run?');
      } else if (firedAge > staleMs) {
        escalate('stroll', `Factory autoloop stale (${Math.floor(firedAge / 86400000)}d since trigger fired)`);
      } else {
        // Fired is fresh. If completed was ever written and has since gone stale, JOB 4 is broken.
        // If completed is absent entirely, treat as bootstrap — wait until it exists before alerting.
        const completedAge = await markerAgeMs('cron:factory_completed');
        if (completedAge !== null && completedAge > staleMs) {
          escalate('stroll', `Factory fires but JOB 4 not completing (${Math.floor(completedAge / 86400000)}d since last completion)`);
        }
      }
    } catch { /* non-fatal */ }

    // Signal backlog check — if Factory autoloop drains regularly, pending should stay modest.
    // Soft default threshold (Factory may reconsider as scale grows)
    try {
      const signalPending = await kv.list({ prefix: 'marketplace:signal:' });
      const feedbackPending = await kv.list({ prefix: 'feedback:' });
      const backlogCeiling = 5000;
      if (signalPending.keys.length > backlogCeiling) {
        escalate('stroll', `marketplace:signal backlog ${signalPending.keys.length} > ${backlogCeiling} — Factory drain stuck?`);
      }
      if (feedbackPending.keys.length > backlogCeiling) {
        escalate('stroll', `feedback backlog ${feedbackPending.keys.length} > ${backlogCeiling} — Factory drain stuck?`);
      }
    } catch { /* non-fatal */ }

    // Cron marker (proves the job ran — includes issue list for debugging)
    try {
      await kv.put('cron:health_digest', JSON.stringify({
        t: new Date().toISOString(),
        urgency,
        issues: issues.length > 0 ? issues : undefined,
      }), { expirationTtl: 30 * 24 * 60 * 60 });
    } catch { /* non-fatal */ }

    if (!urgency) return;

    // Subject carries both signals: email-exists = come chat, urgency = how fast.
    // Full issue list lives in the KV marker above (cron:health_digest).
    await sendEmail(FOUNDER_EMAIL, `alexandria. — ${urgency}`, '—');
  } catch (err) {
    console.error('Health digest failed:', err);
  }
}
