/**
 * KV persistence layer — replaces filesystem I/O.
 *
 * Single KV namespace (DATA) with key prefixes:
 *   "accounts:encrypted" → AES-256-GCM encrypted JSON of all accounts
 *   "accounts"           → LEGACY plaintext (migrated on first save)
 *   "oauth_clients"      → JSON string of OAuth client registrations
 *   "events:YYYY-MM-DD"  → JSONL string of events for that day
 *
 * KV is eventually consistent across edge locations.
 * Acceptable — these are not real-time critical.
 */

import { encrypt, decrypt } from './crypto.js';

// Global KV reference — set by middleware on each request
let _kv: KVNamespace | null = null;

export function setKV(kv: KVNamespace): void {
  _kv = kv;
}

export function getKV(): KVNamespace {
  if (!_kv) throw new Error('KV not initialized — setKV() must be called first');
  return _kv;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function loadAccounts<T>(): Promise<T> {
  const kv = getKV();

  // Try encrypted blob first (post-migration)
  const encrypted = await kv.get('accounts:encrypted');
  if (encrypted) {
    try {
      return JSON.parse(decrypt(encrypted)) as T;
    } catch (e) {
      // Encrypted key exists but decrypt failed — this is a hard error, not a fallback scenario.
      // Falling back to plaintext here would let an attacker bypass encryption.
      console.error('[kv] CRITICAL: Decrypt failed on existing encrypted blob:', e);
      try {
        const { logEvent } = await import('./analytics.js');
        logEvent('security_degradation', { reason: 'accounts_decrypt_failed', error: String(e) });
      } catch { /* can't log */ }
      // Return empty rather than falling back to potentially stale/tampered plaintext
      return {} as T;
    }
  }

  // Plaintext only valid during initial migration (no encrypted key exists yet)
  const data = await kv.get('accounts', 'json');
  return (data || {}) as T;
}

export async function saveAccounts<T>(accounts: T): Promise<void> {
  const kv = getKV();
  const json = JSON.stringify(accounts, null, 2);

  try {
    await kv.put('accounts:encrypted', encrypt(json));
    // Delete plaintext key on successful encryption (one-time migration)
    try { await kv.delete('accounts'); } catch { /* non-fatal */ }
  } catch (e) {
    // FAIL LOUDLY: encryption failure is a security degradation, not a graceful fallback
    console.error('[kv] CRITICAL: Encrypt failed, saving plaintext:', e);
    await kv.put('accounts', json);
    // Surface to health digest — this must not stay silent
    try {
      const { logEvent } = await import('./analytics.js');
      logEvent('security_degradation', { reason: 'accounts_encryption_failed', error: String(e) });
    } catch { /* can't log — at least console.error fired */ }
  }
}

// ---------------------------------------------------------------------------
// OAuth Clients
// ---------------------------------------------------------------------------

export async function loadOAuthClients(): Promise<Record<string, unknown>> {
  const kv = getKV();
  const data = await kv.get('oauth_clients', 'json');
  return (data || {}) as Record<string, unknown>;
}

export async function saveOAuthClients(clients: Record<string, unknown>): Promise<void> {
  const kv = getKV();
  await kv.put('oauth_clients', JSON.stringify(clients));
}

// ---------------------------------------------------------------------------
// Events (JSONL log)
// ---------------------------------------------------------------------------

function todayKey(): string {
  return `events:${new Date().toISOString().split('T')[0]}`;
}

export async function appendEvent(line: string): Promise<void> {
  const kv = getKV();
  const key = todayKey();
  const existing = await kv.get(key) || '';
  await kv.put(key, existing + line);
}

export async function getAllEvents(): Promise<string> {
  const kv = getKV();
  const keys = await kv.list({ prefix: 'events:' });
  if (keys.keys.length === 0) return '';

  // Sort by key (date) to get chronological order
  const sorted = keys.keys.sort((a, b) => a.name.localeCompare(b.name));
  const chunks: string[] = [];

  for (const key of sorted) {
    const data = await kv.get(key.name);
    if (data) chunks.push(data);
  }

  return chunks.join('');
}
