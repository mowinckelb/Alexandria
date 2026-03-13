/**
 * Anonymous event logging — factory-level signal.
 *
 * No user data. No content. No tokens. Just event type + timestamp.
 * In-memory counters, reset on server restart. This is intentionally
 * simple — the goal is to see patterns in aggregate usage, not to
 * build a database.
 *
 * OPEN QUESTION — THE PASSIVE FACTORY LOOP:
 * These events are the raw material for defining the Blueprint's
 * objective function / loss function. The Blueprint currently only
 * improves via manual COO iteration (the active loop). The passive
 * loop — where the Blueprint improves itself across all users based
 * on observable metrics — requires:
 *   1. An objective function (what does "better" mean?)
 *   2. Data flowing into that metric (these events)
 *   3. A mechanism that adjusts the Blueprint based on that data
 *
 * Step 1 is the founder-level decision. Steps 2-3 are engineering.
 * We're building step 2 now so step 1 has something to work with.
 */

export type EventType =
  | 'extraction'           // update_constitution called
  | 'extraction_strong'    // extraction with strong signal
  | 'extraction_moderate'  // extraction with moderate signal
  | 'extraction_tentative' // extraction with tentative signal
  | 'constitution_read'    // read_constitution called
  | 'vault_read'           // query_vault called
  | 'mode_editor'          // activate_editor called
  | 'mode_mercury'         // activate_mercury called
  | 'mode_publisher'       // activate_publisher called
  | 'mode_exit'            // switch_mode called
  | 'notepad_update'       // update_notepad called
  | 'feedback_correction'  // log_feedback with correction
  | 'feedback_positive'    // log_feedback with positive
  | 'feedback_negative'    // log_feedback with negative
  | 'feedback_pattern';    // log_feedback with pattern

interface EventLog {
  counts: Record<EventType, number>;
  since: string; // ISO timestamp of server start
  lastEvent: string | null; // ISO timestamp of most recent event
}

const counts: Record<EventType, number> = {
  extraction: 0,
  extraction_strong: 0,
  extraction_moderate: 0,
  extraction_tentative: 0,
  constitution_read: 0,
  vault_read: 0,
  mode_editor: 0,
  mode_mercury: 0,
  mode_publisher: 0,
  mode_exit: 0,
  notepad_update: 0,
  feedback_correction: 0,
  feedback_positive: 0,
  feedback_negative: 0,
  feedback_pattern: 0,
};

const since = new Date().toISOString();
let lastEvent: string | null = null;

export function logEvent(type: EventType): void {
  counts[type]++;
  lastEvent = new Date().toISOString();
}

export function getAnalytics(): EventLog {
  return { counts, since, lastEvent };
}
