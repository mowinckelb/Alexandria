/** Protocol auth — account type, key extraction, lookup. */

import { loadAccount, getAuthIndex } from './kv.js';
import { hashApiKey } from './crypto.js';

export interface Account {
  github_id: number;
  github_login: string;
  email: string;
  api_key_hash: string;
  email_token: string;
  api_key?: string;
  created_at: string;
  last_session: string;
  installed_at?: string;
  followup_count?: number;
  last_engagement_email?: string;
  engagement_interval_days?: number;
  engagement_opt_out?: boolean;
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_id?: string;
  current_period_end?: string;
  constitution_size?: number;
  brief_opt_out?: boolean;
  brief_interval_days?: number;
  last_brief?: string;
}

export type AccountStore = Record<string, Account>;

export function extractApiKey(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | null {
  const auth = c.req.header('authorization');
  if (auth && auth.startsWith('Bearer alex_')) return auth.slice(7);
  const qKey = c.req.query('key');
  if (qKey && qKey.startsWith('alex_')) return qKey;
  return null;
}

export async function findByApiKey(key: string): Promise<Account | null> {
  const keyHash = hashApiKey(key);
  const githubKey = await getAuthIndex(keyHash);
  if (githubKey) {
    const account = await loadAccount(githubKey);
    if (account) return account as unknown as Account;
  }
  return null;
}

export async function requireAuth(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): Promise<{ key: string; account: Account } | null> {
  const key = extractApiKey(c);
  if (!key) return null;
  const account = await findByApiKey(key);
  if (!account) return null;
  return { key, account };
}
