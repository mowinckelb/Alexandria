/**
 * Marketplace feedback substrate — stores Author-explicit feedback and the
 * daily library-signal snapshot in Cloudflare KV.
 *
 * History: this module previously also stored anonymous "machine signals"
 * the Engine wrote auto-on-session-close. Deleted 2026-05-15 — sovereignty
 * was promissory (the Engine was instructed not to include Author content,
 * but Authors had to trust the prompt). Replaced by Author-explicit
 * feedback only: Authors type what they want to send via the feedback
 * pulse, attribution is intentional, consent is mechanical.
 *
 * Key layout (in the DATA KV namespace):
 *   feedback:{iso-ts}:{hash}   → JSON {author, t, text, context}.  No TTL.
 *   library-signal             → server-computed funnel snapshot, single key.
 *
 * Reads: founder inspects via `wrangler kv key list --binding=DATA --remote --prefix=feedback:`
 * and `wrangler kv key get`. Add an admin endpoint if/when CLI grows painful.
 */
import { logEvent } from './analytics.js';
import { getKV } from './kv.js';

/** Stable short hash for key uniqueness. Not security-sensitive. */
async function shortHash(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8);
}

/** Author-explicit feedback. Attributed (Authors type it; founder reads it for context). */
export async function publishFeedback(payload: { author: string; t: string; text: string; context?: string }): Promise<void> {
  const hash = await shortHash(payload.text + payload.t);
  const key = `feedback:${payload.t}:${hash}`;
  const value = JSON.stringify(payload);
  await getKV().put(key, value);
  logEvent('feedback_published', { key });
}

/** Daily snapshot of library funnel/engagement. Server-computed (no Author
 *  content). Single overwriting key — only the latest snapshot matters. */
export async function publishLibrarySignalSnapshot(text: string): Promise<void> {
  await getKV().put('library-signal', text);
  logEvent('library_signal_snapshot_published', {});
}
