/**
 * General compounding — append-only event log.
 *
 * Every tool call produces one JSONL line. No user data. No content.
 * No tokens. Just event type, timestamp, and open-ended metadata.
 *
 * Storage: KV namespace with daily keys (events:YYYY-MM-DD).
 * In-memory summary for fast /analytics reads (warm between requests).
 */

import { appendEvent, getAllEvents } from './kv.js';

// ---------------------------------------------------------------------------
// Types — intentionally open-ended
// ---------------------------------------------------------------------------

/** Any string key-value pairs. No fixed schema. Evolves with the system. */
export type EventMeta = Record<string, string>;

// ---------------------------------------------------------------------------
// In-memory summary (fast reads for /analytics, warm between requests)
// ---------------------------------------------------------------------------

interface Summary {
  total: number;
  by_key: Record<string, number>;
  since: string;
  last_event: string | null;
}

const summary: Summary = {
  total: 0,
  by_key: {},
  since: new Date().toISOString(),
  last_event: null,
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Log an event. One JSONL line to KV, update in-memory summary.
 * Fire-and-forget — never blocks the tool response.
 */
export function logEvent(type: string, meta?: EventMeta): void {
  const now = new Date().toISOString();

  // In-memory summary
  summary.total++;
  summary.last_event = now;
  const parts: string[] = [type, ...Object.values(meta || {})];
  const key = parts.join(':');
  summary.by_key[key] = (summary.by_key[key] || 0) + 1;

  // JSONL entry — flat, open-ended
  const entry: Record<string, string> = { t: now, e: type, ...meta };
  const line = JSON.stringify(entry) + '\n';

  appendEvent(line).catch((err) => {
    console.error('[analytics] Failed to append event:', err);
  });
}

/**
 * Get summary counts (fast, in-memory).
 */
export function getAnalytics(): Summary {
  return { ...summary, by_key: { ...summary.by_key } };
}

/**
 * Get full event log as raw JSONL string.
 */
export async function getEventLog(): Promise<string> {
  try {
    return await getAllEvents();
  } catch {
    return '';
  }
}

/**
 * Monitoring dashboard — verification signals.
 */
export async function getDashboard(): Promise<Record<string, unknown>> {
  let events: Record<string, string>[] = [];
  let parseErrors = 0;
  try {
    const raw = await getAllEvents();
    if (!raw) return { status: 'no data', message: 'No events logged yet.' };
    const lines = raw.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch {
        parseErrors++;
      }
    }
    if (parseErrors > 0) {
      console.error(`[analytics] Skipped ${parseErrors} corrupted event log lines`);
    }
  } catch {
    return { status: 'no data', message: 'No events logged yet.' };
  }

  if (events.length === 0) {
    return { status: 'no data', message: 'No events logged yet.' };
  }

  // 1. Extraction survival rate
  const extractions = events.filter(e => e.e === 'extraction').length;
  const corrections = events.filter(e => e.e === 'feedback' && e.feedback_type === 'correction').length;
  const extractionSurvivalRate = extractions > 0
    ? Math.round((1 - corrections / extractions) * 100) / 100
    : null;

  const extractionsByDomain: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'extraction')) {
    const d = e.domain || e.d || 'unknown';
    extractionsByDomain[d] = (extractionsByDomain[d] || 0) + 1;
  }

  const extractionsByStrength: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'extraction')) {
    const s = e.strength || e.s || 'unknown';
    extractionsByStrength[s] = (extractionsByStrength[s] || 0) + 1;
  }

  const extractionsByTarget: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'extraction')) {
    const t = e.target || 'unknown';
    extractionsByTarget[t] = (extractionsByTarget[t] || 0) + 1;
  }

  // 2. Constitution depth
  const domainsCovered = Object.keys(extractionsByDomain).filter(d => d !== 'unknown').length;
  const strongRatio = extractions > 0
    ? Math.round((extractionsByStrength['strong'] || 0) / extractions * 100) / 100
    : null;

  // 3. Return rate
  let sessionCount = events.length > 0 ? 1 : 0;
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].t).getTime();
    const curr = new Date(events[i].t).getTime();
    if (curr - prev > 60 * 60 * 1000) sessionCount++;
  }

  // 4. Feedback sentiment
  const feedbackByType: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'feedback')) {
    const ft = e.feedback_type || e.f || 'unknown';
    feedbackByType[ft] = (feedbackByType[ft] || 0) + 1;
  }
  const totalFeedback = Object.values(feedbackByType).reduce((a, b) => a + b, 0);
  const positiveRatio = totalFeedback > 0
    ? Math.round((feedbackByType['positive'] || 0) / totalFeedback * 100) / 100
    : null;

  // 5. Mode activations
  const modeActivations: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'mode')) {
    const m = e.mode || e.m || 'unknown';
    modeActivations[m] = (modeActivations[m] || 0) + 1;
  }

  // 6. Vault intake
  const vaultIntakeEvents = events.filter(e => e.e === 'vault_intake');
  const vaultIntakeTotal = vaultIntakeEvents.reduce(
    (sum, e) => sum + (parseInt(e.count) || 0), 0
  );
  const vaultTrackerErrors = events.filter(e => e.e === 'vault_tracker_error').length;
  const vaultListErrors = events.filter(e => e.e === 'vault_intake_error').length;

  // 7. Drive errors
  const driveWriteErrors = events.filter(e => e.e === 'drive_write_error').length;
  const droppedWrites = events.filter(e => e.e === 'write_dropped').length;
  const authErrors = events.filter(e => e.e === 'auth_error').length;
  const systemObservations = events.filter(
    e => e.e === 'feedback' && e.feedback_type === 'pattern'
  ).length;

  // Time range + staleness
  const firstEvent = events[0]?.t || null;
  const lastEvent = events[events.length - 1]?.t || null;
  const hoursSinceLastEvent = lastEvent
    ? Math.round((Date.now() - new Date(lastEvent).getTime()) / (1000 * 60 * 60) * 10) / 10
    : null;
  const stale = hoursSinceLastEvent !== null && hoursSinceLastEvent > 24;

  // Anomaly detection
  const sessionEventTypes = new Set(['prosumer_session', 'session_start', 'session_end']);
  const sessionEvents = events.filter(e => sessionEventTypes.has(e.e));
  const lastSessionEvent = sessionEvents.length > 0 ? sessionEvents[sessionEvents.length - 1].t : null;
  const hoursSinceLastSession = lastSessionEvent
    ? Math.round((Date.now() - new Date(lastSessionEvent).getTime()) / (1000 * 60 * 60) * 10) / 10
    : null;

  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const smokeFailures24h = events.filter(
    e => (e.e === 'hook_failure' || e.event === 'hook_failure') && new Date(e.t).getTime() > twentyFourHoursAgo
  ).length;

  // Cron execution status
  let cronStatus: Record<string, unknown> = {};
  try {
    const { getKV } = await import('./kv.js');
    const kv = getKV();
    for (const job of ['followup', 'engagement', 'health_digest']) {
      const raw = await kv.get(`cron:${job}`);
      cronStatus[job] = raw ? JSON.parse(raw) : { t: null, status: 'never_run' };
    }
  } catch { /* non-fatal */ }

  // Active users — per-author session counts and last seen
  const authorStats: Record<string, { sessions: number; last_seen: string; failures: number; platforms: Set<string> }> = {};
  for (const e of events) {
    if (e.e !== 'prosumer_session' || !e.author) continue;
    if (!authorStats[e.author]) {
      authorStats[e.author] = { sessions: 0, last_seen: e.t, failures: 0, platforms: new Set() };
    }
    const stat = authorStats[e.author];
    stat.sessions++;
    if (e.t > stat.last_seen) stat.last_seen = e.t;
    if (e.event === 'hook_failure') stat.failures++;
    if (e.platform) stat.platforms.add(e.platform);
  }

  const users = Object.entries(authorStats).map(([login, stat]) => ({
    login,
    sessions: stat.sessions,
    last_seen: stat.last_seen,
    hours_ago: Math.round((Date.now() - new Date(stat.last_seen).getTime()) / (1000 * 60 * 60) * 10) / 10,
    failures: stat.failures,
    platforms: [...stat.platforms],
  })).sort((a, b) => b.hours_ago - a.hours_ago); // most stale first

  return {
    status: stale ? 'stale — no events for 24+ hours, possible silent connector failure'
      : parseErrors > 0 ? `ok — ${parseErrors} corrupted log lines skipped`
      : 'ok',
    time_range: { first: firstEvent, last: lastEvent, hours_since_last: hoursSinceLastEvent },
    cron: cronStatus,
    users,
    total_events: events.length,
    parse_errors: parseErrors,
    extraction_survival_rate: extractionSurvivalRate,
    extractions: {
      total: extractions,
      by_domain: extractionsByDomain,
      by_strength: extractionsByStrength,
      by_target: extractionsByTarget,
    },
    depth: {
      domains_covered: domainsCovered,
      strong_ratio: strongRatio,
    },
    sessions: sessionCount,
    captures_per_session: sessionCount > 0 ? Math.round(extractions / sessionCount * 10) / 10 : null,
    feedback: {
      total: totalFeedback,
      by_type: feedbackByType,
      positive_ratio: positiveRatio,
    },
    mode_activations: modeActivations,
    vault_intake: {
      sessions_with_intake: vaultIntakeEvents.length,
      total_files_surfaced: vaultIntakeTotal,
    },
    errors: {
      drive_write_errors: driveWriteErrors,
      dropped_writes: droppedWrites,
      vault_tracker_errors: vaultTrackerErrors,
      vault_list_errors: vaultListErrors,
      log_parse_errors: parseErrors,
      auth_errors: authErrors,
    },
    system_observations: systemObservations,
    anomaly: {
      last_session_event: lastSessionEvent,
      hours_since_last_session: hoursSinceLastSession,
      smoke_failures_24h: smokeFailures24h,
    },
    library: await getLibraryMetrics(events),
  };
}

/**
 * Library metrics — pulled from D1 (structured) + event log (signal).
 */
async function getLibraryMetrics(events: Record<string, string>[]): Promise<Record<string, unknown>> {
  // Event-based metrics (from JSONL log)
  const libraryEvents = events.filter(e => e.e?.startsWith('library_'));
  const shadowViews = libraryEvents.filter(e => e.e === 'library_shadow_view').length;
  const pulseViews = libraryEvents.filter(e => e.e === 'library_pulse_view').length;
  const quizzesTaken = libraryEvents.filter(e => e.e === 'library_quiz_taken').length;
  const workViews = libraryEvents.filter(e => e.e === 'library_work_view').length;
  const paidAccess = libraryEvents.filter(e => e.e === 'library_paid_access').length;
  const publishes = libraryEvents.filter(e => e.e === 'library_publish_shadow').length;
  const purchases = libraryEvents.filter(e => e.e === 'library_purchase').length;

  // D1 metrics (if available)
  let d1Metrics: Record<string, unknown> = {};
  try {
    const { getDB } = await import('./db.js');
    const db = getDB();
    const counts = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM authors) as total_authors,
        (SELECT COUNT(*) FROM shadows) as total_shadows,
        (SELECT COUNT(*) FROM quizzes WHERE active = 1) as total_quizzes,
        (SELECT COUNT(*) FROM works) as total_works,
        (SELECT COUNT(*) FROM quiz_results) as total_quiz_completions,
        (SELECT COUNT(*) FROM referrals) as total_referrals
    `).first();
    if (counts) d1Metrics = counts as Record<string, unknown>;
  } catch {
    // D1 not available — ok, just return event-based metrics
  }

  return {
    events: { shadow_views: shadowViews, pulse_views: pulseViews, quizzes_taken: quizzesTaken, work_views: workViews, paid_access: paidAccess, publishes, purchases },
    ...d1Metrics,
  };
}

/**
 * Per-user event history — drill into a specific author's sessions and errors.
 */
export async function getUserEvents(login: string): Promise<Record<string, unknown>> {
  let events: Record<string, string>[] = [];
  try {
    const raw = await getAllEvents();
    if (!raw) return { status: 'no data', author: login };
    const lines = raw.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        if (ev.author === login) events.push(ev);
      } catch { continue; }
    }
  } catch {
    return { status: 'no data', author: login };
  }

  const sessions = events.filter(e => e.e === 'prosumer_session');
  const failures = sessions.filter(e => e.event === 'hook_failure');
  const feedback = events.filter(e => e.e === 'user_feedback');
  const signals = events.filter(e => e.e === 'machine_signal');
  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  return {
    author: login,
    total_events: events.length,
    sessions: {
      total: sessions.length,
      last: lastSession,
      platforms: [...new Set(sessions.map(s => s.platform).filter(Boolean))],
      blueprint_fetched_rate: sessions.length > 0
        ? Math.round(sessions.filter(s => s.blueprint_fetched === 'true').length / sessions.length * 100) + '%'
        : null,
      constitution_injected_rate: sessions.length > 0
        ? Math.round(sessions.filter(s => s.constitution_injected === 'true').length / sessions.length * 100) + '%'
        : null,
    },
    failures: {
      total: failures.length,
      recent: failures.slice(-5),
    },
    feedback: feedback.slice(-10),
    machine_signals: signals.length,
    recent_events: events.slice(-20),
  };
}

export async function getRecentEvents(n: number = 200): Promise<string> {
  try {
    const full = await getAllEvents();
    if (!full) return '';
    const lines = full.trim().split('\n');
    const recent = lines.slice(-n);
    return recent.join('\n');
  } catch {
    return '';
  }
}
