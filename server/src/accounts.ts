/** Company account management — billing, admin, key generation, account operations. */

import { randomBytes, timingSafeEqual } from 'crypto';
import { loadAccounts, saveAccount } from './kv.js';
import { hashApiKey } from './crypto.js';
import { requireAuth } from './auth.js';
import type { Account, AccountStore } from './auth.js';

export async function getAccounts(): Promise<AccountStore> {
  return await loadAccounts<AccountStore>();
}

export function findAccountByEmailToken(accounts: AccountStore, token: string): string | null {
  const tokenBuf = Buffer.from(token);
  for (const [storeKey, acct] of Object.entries(accounts)) {
    if (!acct.email_token) continue;
    const expectedBuf = Buffer.from(acct.email_token);
    if (tokenBuf.length === expectedBuf.length && timingSafeEqual(tokenBuf, expectedBuf)) return storeKey;
  }
  return null;
}

export async function updateAccountBilling(identifier: string, billing: Partial<Pick<Account, 'stripe_customer_id' | 'subscription_status' | 'subscription_id' | 'current_period_end'>>): Promise<void> {
  const accounts = await loadAccounts<AccountStore>();
  let storeKey: string | undefined;
  if (identifier.startsWith('alex_')) {
    const keyHash = hashApiKey(identifier);
    storeKey = Object.keys(accounts).find(k => accounts[k].api_key_hash === keyHash);
  }
  if (!storeKey) {
    storeKey = Object.keys(accounts).find(k => accounts[k].github_login === identifier);
  }
  if (!storeKey) return;
  Object.assign(accounts[storeKey], billing);
  await saveAccount(storeKey, accounts[storeKey] as unknown as Record<string, unknown>);
}

export async function getBillingSummary(): Promise<Record<string, number>> {
  const accounts = await getAccounts();
  const counts: Record<string, number> = { total_accounts: 0 };
  for (const acct of Object.values(accounts)) {
    counts.total_accounts++;
    const status = acct.subscription_status || 'none';
    counts[`billing_${status}`] = (counts[`billing_${status}`] || 0) + 1;
    if (acct.installed_at) counts.installed = (counts.installed || 0) + 1;
  }
  return counts;
}

export function generateApiKey(): string {
  return `alex_${randomBytes(16).toString('hex')}`;
}

export async function requireAdmin(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): Promise<{ key: string; account: Account } | null> {
  const auth = await requireAuth(c);
  if (!auth) return null;
  const adminLogin = process.env.ADMIN_GITHUB_LOGIN || 'mowinckelb';
  if (auth.account.github_login !== adminLogin) return null;
  return auth;
}
