/**
 * General compounding — append-only event log.
 *
 * Every tool call produces one JSONL line. No user data. No content.
 * No tokens. Just event type, timestamp, and open-ended metadata.
 *
 * THE LOOP (fully automatic, no human in the loop):
 * 1. Tool calls produce events → appended to log
 * 2. Mode activations include recent events in the response
 * 3. The model reads the events, sees patterns, adjusts behavior
 * 4. Adjusted behavior produces new events → back to step 1
 *
 * As models improve, step 3 extracts more from the same data.
 * As the log grows, step 3 has more patterns to find.
 * The data format is open-ended (Record<string, string>) so future
 * versions can log richer metadata without changing the interface.
 * The system compounds on itself. Bitter lesson.
 *
 * Storage: append-only JSONL at DATA_DIR/events.jsonl.
 * Fly.io volume for persistence across deploys. Without volume,
 * accumulates between deploys (still better than in-memory).
 */

import { appendFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR || './data';
const LOG_FILE = join(DATA_DIR, 'events.jsonl');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

const dataDirReady = ensureDataDir();

// ---------------------------------------------------------------------------
// Types — intentionally open-ended
// ---------------------------------------------------------------------------

/** Any string key-value pairs. No fixed schema. Evolves with the system. */
export type EventMeta = Record<string, string>;

// ---------------------------------------------------------------------------
// In-memory summary (fast reads for /analytics)
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
 * Log an event. One JSONL line to disk, update in-memory summary.
 * Fire-and-forget — never blocks the tool response.
 *
 * Event type is just a string. Metadata is open-ended.
 * Future code can log anything without changing this interface.
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

  dataDirReady.then(() => {
    appendFile(LOG_FILE, line).catch((err) => {
      console.error('[analytics] Failed to append event:', err);
    });
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
    await dataDirReady;
    return await readFile(LOG_FILE, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Get the last N events as raw JSONL.
 * Included in every mode activation so the model sees aggregate patterns
 * and adjusts behavior automatically. No human review step.
 *
 * As models get larger context windows, increase N.
 * As the log grows, more patterns become visible.
 * Both scale automatically. Bitter lesson.
 */
/**
 * Monitoring dashboard — verification signals.
 * The philosophy IS the objective function. These metrics are
 * verification that the philosophy is being served — not
 * optimization targets. Never chase a metric. Use them to
 * verify, diagnose, and give the AI ground truth feedback.
 */
export async function getDashboard(): Promise<Record<string, unknown>> {
  let events: Record<string, string>[] = [];
  try {
    await dataDirReady;
    const raw = await readFile(LOG_FILE, 'utf-8');
    events = raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return { status: 'no data', message: 'No events logged yet.' };
  }

  if (events.length === 0) {
    return { status: 'no data', message: 'No events logged yet.' };
  }

  // 1. Extraction survival rate
  // Proxy: 1 - (correction feedbacks / total extractions)
  const extractions = events.filter(e => e.e === 'extraction').length;
  const corrections = events.filter(e => e.e === 'feedback' && e.feedback_type === 'correction').length;
  const extractionSurvivalRate = extractions > 0
    ? Math.round((1 - corrections / extractions) * 100) / 100
    : null;

  // Extractions by domain
  const extractionsByDomain: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'extraction')) {
    const d = e.domain || e.d || 'unknown';
    extractionsByDomain[d] = (extractionsByDomain[d] || 0) + 1;
  }

  // Extractions by signal strength
  const extractionsByStrength: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'extraction')) {
    const s = e.strength || e.s || 'unknown';
    extractionsByStrength[s] = (extractionsByStrength[s] || 0) + 1;
  }

  // 2. Constitution depth score
  // Proxy: total extractions, domain coverage (how many of 6 domains have entries),
  // strength distribution (more "strong" = more mature)
  const domainsCovered = Object.keys(extractionsByDomain).filter(d => d !== 'unknown').length;
  const strongRatio = extractions > 0
    ? Math.round((extractionsByStrength['strong'] || 0) / extractions * 100) / 100
    : null;

  // 3. Return rate (session count)
  // Proxy: group events by time gaps >1 hour = new session
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

  // 5. Mode activation frequency
  const modeActivations: Record<string, number> = {};
  for (const e of events.filter(ev => ev.e === 'mode')) {
    const m = e.mode || e.m || 'unknown';
    modeActivations[m] = (modeActivations[m] || 0) + 1;
  }

  // System observations (feedback with "system:" prefix)
  const systemObservations = events.filter(
    e => e.e === 'feedback' && e.feedback_type === 'pattern'
  ).length;

  // Time range + staleness check
  const firstEvent = events[0]?.t || null;
  const lastEvent = events[events.length - 1]?.t || null;
  const hoursSinceLastEvent = lastEvent
    ? Math.round((Date.now() - new Date(lastEvent).getTime()) / (1000 * 60 * 60) * 10) / 10
    : null;
  const stale = hoursSinceLastEvent !== null && hoursSinceLastEvent > 24;

  return {
    status: stale ? 'stale — no events for 24+ hours, possible silent connector failure' : 'ok',
    time_range: { first: firstEvent, last: lastEvent, hours_since_last: hoursSinceLastEvent },
    total_events: events.length,

    extraction_survival_rate: extractionSurvivalRate,
    extractions: {
      total: extractions,
      by_domain: extractionsByDomain,
      by_strength: extractionsByStrength,
    },

    depth: {
      domains_covered: `${domainsCovered}/6`,
      strong_ratio: strongRatio,
    },

    sessions: sessionCount,

    feedback: {
      total: totalFeedback,
      by_type: feedbackByType,
      positive_ratio: positiveRatio,
    },

    mode_activations: modeActivations,

    system_observations: systemObservations,
  };
}

export async function getRecentEvents(n: number = 200): Promise<string> {
  try {
    await dataDirReady;
    const full = await readFile(LOG_FILE, 'utf-8');
    const lines = full.trim().split('\n');
    const recent = lines.slice(-n);
    return recent.join('\n');
  } catch {
    return '';
  }
}
