/** Cron jobs — health digest, followup, engagement. Called by worker scheduled handler. */

import { loadAccounts, saveAccounts, getKV, getRecentDaysEvents } from './kv.js';
import { sendEmail, sendEmailsBatched, sendFollowupEmail, sendEngagementEmail, MAX_FOLLOWUPS, DEFAULT_ENGAGEMENT_DAYS, FOUNDER_EMAIL } from './email.js';
import { formatPT } from './time.js';
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
type Escalate = (u: Urgency, reason: string) => void;

/**
 * D1 health probe + schema/invariant checks. Extracted from runHealthDigest
 * because it's the longest subsection (multiple independent D1 queries) and
 * benefits most from being a named unit.
 */
async function probeD1(escalate: Escalate): Promise<void> {
  try {
    const db = (globalThis as any).__d1 as D1Database | undefined;
    if (!db) {
      escalate('sprint', 'D1 not bound');
      return;
    }
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
  } catch (e) {
    escalate('sprint', `D1 probe failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Factory autoloop liveness — two markers: fired (JOB 0) + completed (end of JOB 4).
 * Fired stale → trigger dead. Completed stale while fired fresh → JOB 4 silently broken.
 */
async function checkFactoryLiveness(kv: KVNamespace, escalate: Escalate): Promise<void> {
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
}

export interface EventScanResult {
  serverErrors: number;
  deprecatedHits: number;
  staleClientCalls: number;
  setupFailures: number;
  deprecatedByPath: Map<string, number>;
  clientVersions: Map<string, number>;
  setupFailuresByStatus: Map<string, number>;
}

/**
 * Pure function: scan a JSONL event log for events that feed alarms.
 * Extracted from runHealthDigest so the counter logic is testable in
 * isolation — see server/test/cron-scanner.ts. Malformed lines are
 * skipped silently (logs can contain partial writes); events outside
 * [cutoff, now] are ignored.
 */
export function scanEventsForAlarms(rawLog: string, cutoff: number): EventScanResult {
  const r: EventScanResult = {
    serverErrors: 0,
    deprecatedHits: 0,
    staleClientCalls: 0,
    setupFailures: 0,
    deprecatedByPath: new Map(),
    clientVersions: new Map(),
    setupFailuresByStatus: new Map(),
  };
  for (const line of rawLog.split('\n')) {
    if (!line) continue;
    try {
      const ev = JSON.parse(line);
      if (new Date(ev.t).getTime() < cutoff) continue;
      if (ev.e === 'server_error') r.serverErrors++;
      else if (ev.e === 'deprecated_hit') {
        // CI smoke fires hits every 6h to verify the alarm path. Skip those —
        // they're verification noise, not real stuck installs.
        if (ev.smoke === 'true') continue;
        r.deprecatedHits++;
        const p = ev.path || '(unknown)';
        r.deprecatedByPath.set(p, (r.deprecatedByPath.get(p) || 0) + 1);
      } else if (ev.e === 'client_version_seen') {
        const v = ev.version || 'unset';
        r.clientVersions.set(v, (r.clientVersions.get(v) || 0) + 1);
        // Only the bash shim path is upgradeable from our side. Native MCP clients
        // (Claude Desktop/web) legitimately don't set X-Alexandria-Client.
        if (v === 'unset' || v === 'unset-curl') r.staleClientCalls++;
      } else if (ev.e === 'setup_report') {
        const status = ev.status || 'unknown';
        if (status !== 'ok') {
          r.setupFailures++;
          r.setupFailuresByStatus.set(status, (r.setupFailuresByStatus.get(status) || 0) + 1);
        }
      }
    } catch { continue; }
  }
  return r;
}

export async function runHealthDigest(opts: { sendEmailOnAlarm?: boolean } = { sendEmailOnAlarm: true }): Promise<void> {
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

    await probeD1(escalate);

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

    // Event log analysis — delegate to the pure scanEventsForAlarms helper
    // (testable in isolation, see server/test/cron-scanner.ts). Test-tag
    // filtering stays here because drift semantics may evolve independently.
    try {
      const raw = await getRecentDaysEvents(2);
      if (raw) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const scan = scanEventsForAlarms(raw, cutoff);
        if (scan.serverErrors > 0) escalate('stroll', `${scan.serverErrors} server errors in 24h`);
        // deprecatedHits / staleClientCalls intentionally don't escalate —
        // auto-remediation already runs (worker sends upgrade email per stuck
        // user, dedupe 7d). Counts still flow into the cached digest marker
        // for /analytics/dashboard visibility, just no founder ping.
        if (scan.setupFailures > 0) {
          const dist = [...scan.setupFailuresByStatus.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}=${n}`).join(', ');
          escalate('stroll', `${scan.setupFailures} setup reports with non-ok status in 24h (${dist})`);
        }
        const testTags = new Set(['smoke-test', 'ci-smoke', 'check-script', 'check-install', 'scheduled-agent']);
        const realVersions = [...scan.clientVersions.entries()].filter(([v]) => !testTags.has(v));
        if (realVersions.length > 1) {
          // Natural drift (clients upgrading across a push) resolves in hours.
          // Stuck = a version still appearing >24h after a newer version was
          // first observed. Filter via per-version first-seen tracked in KV.
          const firstSeen = new Map<string, number>();
          for (const [v] of realVersions) {
            try {
              const raw = await kv.get(`version_first_seen:${v}`);
              if (raw) firstSeen.set(v, new Date(raw).getTime());
            } catch { /* non-fatal */ }
          }
          const newestFirstSeen = Math.max(0, ...Array.from(firstSeen.values()));
          const stuckThreshold = newestFirstSeen - 24 * 60 * 60 * 1000;
          const stuckVersions = realVersions.filter(([v]) => {
            const fs = firstSeen.get(v);
            return fs !== undefined && fs < stuckThreshold;
          });
          if (stuckVersions.length > 0) {
            const dist = stuckVersions.sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}=${n}`).join(', ');
            escalate('stroll', `stuck clients >24h behind current: ${dist}`);
          }
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

    await checkFactoryLiveness(kv, escalate);

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
    if (opts.sendEmailOnAlarm === false) return;

    // Subject carries urgency; body carries the issue list. Awareness axiom:
    // a notification without actionable content is just a notification.
    const body = `<div style="font-family:'EB Garamond',Georgia,serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#3d3630;">` +
      `<p style="margin:0 0 1rem;font-size:0.85rem;opacity:0.5">` + formatPT(new Date()) + `</p>` +
      issues.map(i => `<p style="margin:0 0 0.5rem;line-height:1.5;">${i.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('') +
      `<p style="margin:2rem 0 0;font-size:0.75rem;opacity:0.4"><a href="https://mcp.mowinckel.ai/analytics/dashboard" style="color:#8a8078">dashboard</a></p>` +
      `</div>`;
    await sendEmail(FOUNDER_EMAIL, `alexandria. — ${urgency}`, body);
  } catch (err) {
    console.error('Health digest failed:', err);
  }
}
