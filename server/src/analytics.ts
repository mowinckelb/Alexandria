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

  return {
    status: stale ? 'stale — no events for 24+ hours, possible silent connector failure'
      : parseErrors > 0 ? `ok — ${parseErrors} corrupted log lines skipped`
      : 'ok',
    time_range: { first: firstEvent, last: lastEvent, hours_since_last: hoursSinceLastEvent },
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
      domains_covered: `${domainsCovered}/6`,
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
