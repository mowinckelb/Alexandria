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
 * Railway volume for persistence across deploys. Without volume,
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
