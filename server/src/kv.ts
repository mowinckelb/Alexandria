/**
 * KV persistence layer — replaces filesystem I/O.
 *
 * Single KV namespace (DATA) with key prefixes:
 *   "accounts"        → JSON string of all accounts
 *   "oauth_clients"   → JSON string of OAuth client registrations
 *   "events:YYYY-MM-DD" → JSONL string of events for that day
 *
 * KV is eventually consistent across edge locations.
 * Acceptable — these are not real-time critical.
 */

// Global KV reference — set by middleware on each request
let _kv: KVNamespace | null = null;

export function setKV(kv: KVNamespace): void {
  _kv = kv;
}

function getKV(): KVNamespace {
  if (!_kv) throw new Error('KV not initialized — setKV() must be called first');
  return _kv;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function loadAccounts<T>(): Promise<T> {
  const kv = getKV();
  const data = await kv.get('accounts', 'json');
  return (data || {}) as T;
}

export async function saveAccounts<T>(accounts: T): Promise<void> {
  const kv = getKV();
  await kv.put('accounts', JSON.stringify(accounts, null, 2));
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
