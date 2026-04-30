/** Alexandria HTTP routes. */

import { randomBytes } from 'crypto';
import type { Hono } from 'hono';
import { logEvent } from './analytics.js';
import { countActiveKin, createCheckoutSession, createPortalSession, getStripe } from './billing.js';
import { authErrorHtml, callbackPageHtml } from './templates.js';
import { getDB, getR2 } from './db.js';
import { loadAccounts, loadAccount, saveAccount, setAuthIndex, deleteAccount, getKV, setEmailTokenIndex, getEmailTokenIndex, getAuthIndex } from './kv.js';
import { hashApiKey, generateToken } from './crypto.js';
import { Account, AccountStore, extractApiKey, findByApiKey, requireAuth } from './auth.js';
import { generateApiKey, getAccounts, requireAdmin } from './accounts.js';
import { sendEmail, sendEmailsBatched, sendMorningBrief, FOUNDER_EMAIL } from './email.js';
import { runHealthDigest } from './cron.js';

/**
 * KV-backed rate limit for destructive/expensive admin endpoints.
 * Global (not per-account) since admin is single-user today; the
 * threat model is "admin key leaks, attacker hammers send-email or
 * delete-data endpoints." Cheap reads (GET /admin/...) and factory
 * markers are unrestricted — they're cheap and called frequently
 * by the scheduled autoloop.
 * Returns true if the request should be blocked.
 */
async function checkAdminRateLimit(endpoint: string, limit = 10, windowSec = 60): Promise<boolean> {
  try {
    const kv = getKV();
    const key = `rate:admin:${endpoint}`;
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= limit) return true;
    await kv.put(key, String(count + 1), { expirationTtl: windowSec });
    return false;
  } catch {
    return false; // don't block on KV failure
  }
}

// ---------------------------------------------------------------------------
// Company routes — registered on Hono app
// ---------------------------------------------------------------------------

export function registerRoutes(app: Hono) {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';

  // --- Protocol handshake ---

  app.get('/alexandria', async (c) => {
    const key = extractApiKey(c);

    // Unauthenticated: return protocol spec only
    if (!key) {
      return c.json({
        protocol: 'alexandria',
        version: '1.0',
        constants: {
          account: 'Payment relationship that governs the other two',
          file: 'At least one public file on the server, edited monthly',
          call: 'Communication — machine calls server, server responds',
        },
        endpoints: {
          handshake: '/alexandria',
          file: '/file/{name}',
          call: '/call',
          library: '/library/{id}',
          marketplace: '/marketplace',
        },
        factory: 'https://github.com/mowinckelb/alexandria/tree/main/factory',
        methodology: 'https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/canon/methodology.md',
      });
    }

    // Authenticated: return full status
    const account = await findByApiKey(key);
    if (!account) {
      return c.json({ connected: false, error: 'Invalid API key' }, 401);
    }

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // File obligation — ground truth from protocol_files (where PUT /file/{name} writes)
    let fileLastEdit: string | null = null;
    let fileStatus: 'ok' | 'stale' | 'missing' = 'missing';
    try {
      const db = (globalThis as any).__d1 as D1Database | undefined;
      if (db) {
        const file = await db.prepare(
          `SELECT MAX(updated_at) as last_edit FROM protocol_files WHERE account_id = ?`
        ).bind(String(account.github_id)).first<{ last_edit: string | null }>();
        if (file?.last_edit) {
          fileLastEdit = file.last_edit;
          fileStatus = (Date.now() - new Date(file.last_edit).getTime()) < thirtyDays ? 'ok' : 'stale';
        }
      }
    } catch { /* D1 unavailable — degrade gracefully */ }

    const fileDue = fileLastEdit
      ? new Date(new Date(fileLastEdit).getTime() + thirtyDays).toISOString()
      : new Date(new Date(account.created_at).getTime() + thirtyDays).toISOString();

    // Call obligation — ground truth from protocol_calls
    let callLast: string | null = null;
    try {
      const db = (globalThis as any).__d1 as D1Database | undefined;
      if (db) {
        const lastCall = await db.prepare(
          'SELECT MAX(time) as last_time FROM protocol_calls WHERE account_id = ?'
        ).bind(String(account.github_id)).first<{ last_time: string | null }>();
        callLast = lastCall?.last_time || null;
      }
    } catch {}
    const callStatus: 'ok' | 'stale' = callLast && (Date.now() - new Date(callLast).getTime()) < thirtyDays ? 'ok' : 'stale';
    const callDue = callLast
      ? new Date(new Date(callLast).getTime() + thirtyDays).toISOString()
      : new Date(new Date(account.created_at).getTime() + thirtyDays).toISOString();

    // Kin compliance — all three obligations met (account + file + call) this month
    let kinData = { count: 0, compliant: 0 };
    try {
      kinData = await countActiveKin(account.github_login);
    } catch { /* D1 unavailable — degrade gracefully */ }
    const kinNeeded = parseInt(process.env.KIN_THRESHOLD || '5', 10);

    return c.json({
      connected: true,
      protocol: 'alexandria',
      version: '1.0',
      account: {
        status: account.subscription_status || (process.env.BETA_MODE === 'true' ? 'beta' : 'none'),
        created: account.created_at,
        installed: account.installed_at || null,
      },
      obligations: {
        file_due: fileDue,
        file_status: fileStatus,
        file_last_edit: fileLastEdit,
        call_due: callDue,
        call_status: callStatus,
        call_last: callLast,
      },
      kin: {
        count: kinData.count,
        compliant: kinData.compliant,
        needed: kinNeeded,
        status: kinData.compliant >= kinNeeded
          ? 'free'
          : `${Math.max(0, kinNeeded - kinData.compliant)} more needed`,
      },
      factory: 'https://github.com/mowinckelb/alexandria/tree/main/factory',
      endpoints: {
        file: '/file/{name}',
        call: '/call',
        library: '/library/{id}',
        marketplace: '/marketplace',
      },
    });
  });

  // --- GitHub OAuth ---

  app.get('/auth/github', async (c) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return c.text('GitHub OAuth not configured', 500);
    }

    const state = randomBytes(16).toString('hex');
    const kv = getKV();
    // Preserve referral params through OAuth round-trip
    const ref = c.req.query('ref') || '';
    const refSource = c.req.query('ref_source') || '';
    const refId = c.req.query('ref_id') || '';
    await kv.put(`oauth:${state}`, JSON.stringify({ valid: true, ref, ref_source: refSource, ref_id: refId }), { expirationTtl: 600 });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${SERVER_URL}/auth/github/callback`,
      scope: 'read:user user:email',
      state,
    });

    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/auth/github/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    const kv = getKV();
    const stateRaw = state ? await kv.get(`oauth:${state}`) : null;
    if (!stateRaw) {
      return c.html(authErrorHtml('this sign-in link has expired or is no longer valid.'), 400);
    }
    // Parse state — supports both legacy '1' and new JSON format
    let stateData: { ref?: string; ref_source?: string; ref_id?: string } = {};
    try { stateData = JSON.parse(stateRaw); } catch { /* legacy format */ }
    await kv.delete(`oauth:${state}`);

    try {
      // Exchange code for GitHub access token
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      // Safe JSON parse helper
      const safeJson = async (resp: Response, label: string) => {
        const text = await resp.text();
        try { return JSON.parse(text); }
        catch { throw new Error(`${label} returned non-JSON (${resp.status}): ${text.slice(0, 300)}`); }
      };

      const tokenData = await safeJson(tokenResp, 'Token exchange') as { access_token?: string; error?: string };

      if (!tokenData.access_token) {
        console.error('[oauth] Token exchange returned no access_token:', tokenData.error);
        return c.html(authErrorHtml('github didn\u2019t return a token. try signing in again.'), 400);
      }

      // Fetch user profile
      const userResp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Alexandria' },
      });
      const user = await safeJson(userResp, 'User profile') as { id: number; login: string; email?: string };

      // Fetch email if not public
      let email = user.email || '';
      if (!email) {
        const emailResp = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Alexandria' },
        });
        const emails = await safeJson(emailResp, 'User emails') as Array<{ email: string; primary: boolean }>;
        const primary = emails.find(e => e.primary);
        email = primary?.email || emails[0]?.email || '';
      }

      // Create or update account — direct lookup by github_id key. O(1) for the common case.
      // Fall back to full scan only for legacy accounts keyed by login (pre-github_id migration).
      const key = `github_${user.id}`;
      let existing = await loadAccount(key) as Account | null;
      if (!existing) {
        const allAccounts = await loadAccounts<AccountStore>();
        const legacyKey = Object.keys(allAccounts).find(k => allAccounts[k].github_login === user.login);
        if (legacyKey) existing = allAccounts[legacyKey];
      }

      // Key is shown once on the callback page, then only the hash is stored.
      // New accounts AND returning uninstalled users get a fresh key.
      const isNewAccount = !existing?.api_key_hash;
      const needsKey = isNewAccount || !existing?.installed_at;
      const apiKey = needsKey ? generateApiKey() : '';
      const apiKeyHash = needsKey ? hashApiKey(apiKey) : existing!.api_key_hash;
      const emailToken = existing?.email_token || generateToken();

      const updatedAccount = {
        ...existing,
        github_id: user.id,
        github_login: user.login,
        email,
        api_key_hash: apiKeyHash,
        email_token: emailToken,
        created_at: existing?.created_at || new Date().toISOString(),
        last_session: new Date().toISOString(),
      };
      delete updatedAccount.api_key;
      await saveAccount(key, updatedAccount as unknown as Record<string, unknown>);
      if (needsKey) await setAuthIndex(apiKeyHash, key);
      await setEmailTokenIndex(emailToken, key);

      logEvent('prosumer_signup', {
        github_login: user.login,
        returning: isNewAccount ? 'false' : 'true',
      });

      // Track referral — from OAuth state (round-tripped) or query params (direct)
      const ref = stateData.ref || c.req.query('ref');
      const refSource = stateData.ref_source || c.req.query('ref_source');
      const refId = stateData.ref_id || c.req.query('ref_id');
      if (ref && isNewAccount) {
        try {
          const db = getDB();
          await db.prepare(
            `INSERT INTO referrals (author_id, source_type, source_id, referred_github_login, created_at) VALUES (?, ?, ?, ?, ?)`
          ).bind(ref, refSource || 'direct', refId || null, user.login, new Date().toISOString()).run();
          logEvent('library_signup_referral', { author: ref, source: refSource || 'direct', referred: user.login });
        } catch (e) {
          console.error('[routes] Referral tracking failed:', e);
        }
      }

      // Skip Stripe if user already has payment info
      if (updatedAccount.stripe_customer_id) {
        return c.html(callbackPageHtml(apiKey));
      }

      // Redirect to Stripe Checkout (skip in beta — no card friction)
      const isBeta = process.env.BETA_MODE === 'true';
      if (!isBeta && process.env.STRIPE_SECRET_KEY && email) {
        try {
          const checkoutUrl = await createCheckoutSession({
            email,
            githubLogin: user.login,
            stripeCustomerId: updatedAccount.stripe_customer_id,
          });
          if (checkoutUrl) {
            return c.redirect(checkoutUrl);
          }
        } catch (err) {
          console.error('Stripe checkout redirect failed, falling back:', err);
        }
      }

      return c.html(callbackPageHtml(apiKey));
    } catch (err: any) {
      console.error('GitHub callback error:', err);
      return c.html(authErrorHtml('something broke signing you in. please try again.'), 500);
    }
  });

  // --- Account management (redirects to Stripe portal) ---

  app.get('/account', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);
    const { account } = auth;
    if (!account.stripe_customer_id) {
      return c.text('No billing account found. Complete signup at https://mowinckel.ai/signup', 400);
    }
    try {
      const url = await createPortalSession(account.stripe_customer_id);
      return c.redirect(url);
    } catch (err) {
      console.error('Portal error:', err);
      return c.text('Failed to create billing portal session.', 500);
    }
  });

  // --- Account deletion (GDPR-ready) ---

  app.delete('/account', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);
    const { key, account } = auth;

    const keyHash = hashApiKey(key);
    let storeKey = await getAuthIndex(keyHash);
    if (!storeKey) {
      // Legacy fallback for accounts created before auth indexing.
      const accounts = await getAccounts();
      storeKey = Object.keys(accounts).find(k => accounts[k].api_key_hash === keyHash) || null;
    }

    // Cancel Stripe subscription before deleting account data
    if (account.subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(account.subscription_id);
      } catch (e) {
        console.error('[account] Stripe subscription cancel failed:', e);
      }
    }

    // Remove from KV accounts
    if (storeKey) {
      await deleteAccount(storeKey, keyHash);
    }

    // Remove from D1 — batched for atomicity and performance
    try {
      const db = getDB();
      const login = account.github_login;
      const email = account.email;
      await db.batch([
        db.prepare('DELETE FROM waitlist WHERE email = ?').bind(email),
        db.prepare('DELETE FROM referrals WHERE author_id = ? OR referred_github_login = ?').bind(login, login),
        db.prepare('DELETE FROM access_log WHERE accessor_id = ? OR author_id = ?').bind(login, login),
        db.prepare('DELETE FROM billing_tab WHERE accessor_id = ? OR author_id = ?').bind(login, login),
        db.prepare('DELETE FROM quiz_results WHERE quiz_id IN (SELECT id FROM quizzes WHERE author_id = ?)').bind(login),
        db.prepare('DELETE FROM quizzes WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM shadows WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM pulses WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM works WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM shadow_tokens WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM promo_codes WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM access_codes WHERE author_id = ?').bind(login),
        db.prepare('DELETE FROM authors WHERE id = ?').bind(login),
      ]);
    } catch (e) {
      console.error('[account] D1 cleanup failed:', e);
    }

    // Remove published artifacts from R2
    try {
      const r2 = getR2();
      const login = account.github_login;
      for (const prefix of [`shadows/${login}/`, `pulses/${login}/`, `quizzes/${login}/`, `works/${login}/`]) {
        let cursor: string | undefined;
        do {
          const listed = await r2.list({ prefix, cursor });
          await Promise.all(listed.objects.map(obj => r2.delete(obj.key)));
          cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);
      }
    } catch (e) {
      console.error('[account] R2 cleanup failed:', e);
    }

    // Remove KV feedback and marketplace signals attributed to this user
    try {
      const kv = getKV();
      const login = account.github_login;
      for (const prefix of ['feedback:', 'marketplace:signal:']) {
        let cursor: string | undefined;
        do {
          const page = await kv.list({ prefix, cursor });
          const entries = await Promise.all(
            page.keys.map(async (k) => ({ name: k.name, raw: await kv.get(k.name) }))
          );
          await Promise.all(entries.map(async ({ name, raw }) => {
            try {
              if (!raw) return;
              const data = JSON.parse(raw);
              if (data.author === login) await kv.delete(name);
            } catch { /* skip */ }
          }));
          cursor = page.list_complete ? undefined : page.cursor;
        } while (cursor);
      }
    } catch (e) {
      console.error('[account] KV cleanup failed:', e);
    }

    logEvent('account_deleted', { github_login: account.github_login });
    return c.json({ ok: true, deleted: account.github_login });
  });

  // --- Morning brief (autoloop trigger → email) ---

  app.post('/brief', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);
    const { account } = auth;
    if (!account.email) return c.json({ ok: true, skipped: 'no_email' });

    const body = await c.req.json().catch(() => ({}));
    const { brief, notepad, quote } = body as { brief?: string; notepad?: string; quote?: string };
    if (!brief) return c.json({ error: 'brief is required' }, 400);

    if (account.brief_opt_out) {
      return c.json({ ok: true, skipped: 'opt_out' });
    }

    if (account.brief_interval_days && account.last_brief) {
      const elapsed = Date.now() - new Date(account.last_brief).getTime();
      if (elapsed < account.brief_interval_days * 24 * 60 * 60 * 1000) {
        return c.json({ ok: true, skipped: 'too_recent' });
      }
    }

    await sendMorningBrief(account.email, account.email_token, brief, notepad, quote);

    const githubKey = `github_${account.github_id}`;
    const acct = await loadAccount(githubKey);
    if (acct) {
      acct.last_brief = new Date().toISOString();
      await saveAccount(githubKey, acct);
    }

    logEvent('morning_brief', { author: account.github_login, sent: 'true' });
    return c.json({ ok: true, sent: true });
  });

  // --- Machine signal (Engine → marketplace) ---

  async function handleSignal(c: any) {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);
    const { account } = auth;

    const body = await c.req.json().catch(() => ({}));
    const { signal } = body;
    if (!signal || typeof signal !== 'string' || signal.length === 0) {
      return c.json({ error: 'Empty signal' }, 400);
    }

    // Store as individual timestamped key (avoids read-modify-write on a growing blob)
    // Author attribution enables filtering/weighting during delta processing
    // No TTL: Factory autoloop drains signal after processing via DELETE /admin/marketplace/signals
    try {
      const kv = getKV();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const key_name = `marketplace:signal:${ts}`;
      await kv.put(key_name, JSON.stringify({
        t: new Date().toISOString(),
        author: account.github_login,
        signal: signal.slice(0, 10000),
      }));

      logEvent('machine_signal', { length: String(signal.length) });

      return c.json({ ok: true });
    } catch (err) {
      console.error('Marketplace signal write failed:', err);
      // Log the event even if KV write fails
      logEvent('machine_signal', { length: String(signal.length), error: 'kv_write_failed' });
      return c.json({ ok: true });
    }
  }

  app.post('/marketplace/signal', handleSignal);

  // --- User feedback (end-of-session + direct) ---

  app.post('/feedback', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);
    const { account } = auth;

    const body = await c.req.json().catch(() => ({}));
    const { text, context } = body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return c.json({ error: 'Empty feedback' }, 400);
    }

    try {
      const kv = getKV();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      // No TTL: Factory autoloop drains feedback after processing via DELETE /admin/feedback
      await kv.put(`feedback:${ts}`, JSON.stringify({
        t: new Date().toISOString(),
        author: account.github_login,
        text: text.slice(0, 5000),
        context: context?.slice?.(0, 200) || 'direct',
      }));

      logEvent('user_feedback', {
        author: account.github_login,
        context: context || 'direct',
        length: String(text.length),
      });
      if (context === 'setup') {
        const statusMatch = text.match(/^status:\s*([a-z0-9_-]+)/m);
        logEvent('setup_report', {
          author: account.github_login,
          status: statusMatch?.[1] || 'unknown',
        });
      }

      return c.json({ ok: true });
    } catch (err) {
      console.error('Feedback write failed:', err);
      logEvent('user_feedback', { error: 'kv_write_failed' });
      return c.json({ ok: true });
    }
  });

  app.get('/feedback', async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: 'Unauthorized' }, 403);

    try {
      const kv = getKV();
      const items: unknown[] = [];
      let cursor: string | undefined;
      do {
        const page = await kv.list({ prefix: 'feedback:', cursor });
        const raws = await Promise.all(page.keys.map(k => kv.get(k.name)));
        for (const raw of raws) {
          if (!raw) continue;
          try { items.push(JSON.parse(raw)); } catch { /* skip corrupted */ }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      // Sort newest first
      items.sort((a: any, b: any) => new Date(b.t).getTime() - new Date(a.t).getTime());
      return c.json({ feedback: items });
    } catch (err) {
      console.error('Feedback read failed:', err);
      return c.json({ feedback: [] });
    }
  });

  // --- Email preferences (token-based, not raw API key) ---
  // /email/stop is the only remaining unsubscribe — it gates admin/nudge.

  app.get('/email/stop', async (c) => {
    const token = c.req.query('t');
    if (!token) return c.text('missing token', 400);
    const storeKey = await getEmailTokenIndex(token);
    if (!storeKey) return c.text('not found', 404);
    const acct = await loadAccount(storeKey) as Record<string, any> | null;
    if (!acct) return c.text('not found', 404);
    acct.engagement_opt_out = true;
    await saveAccount(storeKey, acct);
    return c.html(`<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 80px auto; padding: 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1.1rem; line-height: 1.9;">stopped. we&rsquo;ll be here when you&rsquo;re ready.</p>
  <p style="font-size: 0.85rem; color: #8a8078; margin-top: 1rem;">a.</p>
</div>`);
  });

  // --- Brief preferences ---

  app.get('/brief/less', async (c) => {
    const token = c.req.query('t');
    if (!token) return c.text('missing token', 400);
    const storeKey = await getEmailTokenIndex(token);
    if (!storeKey) return c.text('not found', 404);
    const acct = await loadAccount(storeKey) as Record<string, any> | null;
    if (!acct) return c.text('not found', 404);
    const current = acct.brief_interval_days || 1;
    acct.brief_interval_days = current * 2;
    await saveAccount(storeKey, acct);
    logEvent('brief_preference', { author: acct.github_login, action: 'less', interval: String(current * 2) });
    return c.html(`<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 80px auto; padding: 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1.1rem; line-height: 1.9;">done. next brief in ${current * 2} days.</p>
  <p style="font-size: 0.85rem; color: #8a8078; margin-top: 1rem;">a.</p>
</div>`);
  });

  app.get('/brief/stop', async (c) => {
    const token = c.req.query('t');
    if (!token) return c.text('missing token', 400);
    const storeKey = await getEmailTokenIndex(token);
    if (!storeKey) return c.text('not found', 404);
    const acct = await loadAccount(storeKey) as Record<string, any> | null;
    if (!acct) return c.text('not found', 404);
    acct.brief_opt_out = true;
    await saveAccount(storeKey, acct);
    logEvent('brief_preference', { author: acct.github_login, action: 'stop' });
    return c.html(`<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 80px auto; padding: 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1.1rem; line-height: 1.9;">stopped. your autoloop still runs &mdash; just no email.</p>
  <p style="font-size: 0.85rem; color: #8a8078; margin-top: 1rem;">a.</p>
</div>`);
  });

  // Admin: send a one-time email to all uninstalled users
  app.post('/admin/nudge', async (c) => {
    const auth = await requireAdmin(c);
    if (!auth) return c.text('Unauthorized', 403);
    if (await checkAdminRateLimit('nudge', 3, 300)) return c.json({ error: 'Rate limited (sends emails, capped 3/5min)' }, 429);

    const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
    const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
    const accounts = await loadAccounts<AccountStore>();
    const recipients = Object.values(accounts).filter(acct =>
      !acct.installed_at && acct.email && !acct.engagement_opt_out && acct.github_login !== auth.account.github_login
    );

    const html = (acct: Account) =>
      '<div style="font-family: \'EB Garamond\', Georgia, serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">' +
      '<p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 1.5rem;">we fixed a setup issue. <a href="' + WEBSITE_URL + '/signup" style="color: #3d3630;">sign in</a> to get your updated setup command.</p>' +
      '<p style="font-size: 0.72rem; color: #bbb4aa; margin-top: 1.5rem;"><a href="' + SERVER_URL + '/email/stop?t=' + acct.email_token + '" style="color: #8a8078;">stop these emails</a></p>' +
      '</div>';

    const { sent, failed } = await sendEmailsBatched(recipients, acct =>
      sendEmail(acct.email, 'alexandria. — quick fix', html(acct))
    );
    return c.json({ ok: true, sent, failed, total: recipients.length });
  });

  // --- Marketplace: read signals (admin only, called by meta trigger) ---

  // Factory autoloop reads pending signal here. Signal persists until drained via DELETE.
  app.get('/admin/marketplace/signals', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);

    const kv = getKV();
    const signals: { t: string; author: string; signal: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix: 'marketplace:signal:', cursor });
      const raws = await Promise.all(page.keys.map(k => kv.get(k.name)));
      for (const raw of raws) {
        if (!raw) continue;
        try { signals.push(JSON.parse(raw)); } catch { continue; }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    // Strip author for anonymity — Factory autoloop sees signal content only
    const anonymous = signals.map(s => ({ t: s.t, signal: s.signal }));
    return c.json({ signals: anonymous, count: anonymous.length });
  });

  // Factory autoloop drains processed signal. ?before=<iso> required.
  // Signal arriving after <before> survives the drain for the next run.
  app.delete('/admin/marketplace/signals', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);
    if (await checkAdminRateLimit('drain-signals', 5, 60)) return c.json({ error: 'Rate limited (destructive, capped 5/min)' }, 429);
    const before = c.req.query('before');
    if (!before) return c.json({ error: 'before=<iso> required' }, 400);
    const cutoff = Date.parse(before);
    if (isNaN(cutoff)) return c.json({ error: 'before must be parseable ISO timestamp' }, 400);

    const kv = getKV();
    let deleted = 0;
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix: 'marketplace:signal:', cursor });
      const raws = await Promise.all(page.keys.map(k => kv.get(k.name).then(v => ({ key: k.name, v }))));
      for (const { key, v } of raws) {
        if (!v) continue;
        try {
          const obj = JSON.parse(v);
          if (obj.t && Date.parse(obj.t) < cutoff) {
            await kv.delete(key);
            deleted++;
          }
        } catch { continue; }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    logEvent('marketplace_signal_drained', { deleted: String(deleted), before });
    return c.json({ ok: true, deleted });
  });

  // Factory autoloop drains processed feedback. ?before=<iso> required.
  app.delete('/admin/feedback', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);
    if (await checkAdminRateLimit('drain-feedback', 5, 60)) return c.json({ error: 'Rate limited (destructive, capped 5/min)' }, 429);
    const before = c.req.query('before');
    if (!before) return c.json({ error: 'before=<iso> required' }, 400);
    const cutoff = Date.parse(before);
    if (isNaN(cutoff)) return c.json({ error: 'before must be parseable ISO timestamp' }, 400);

    const kv = getKV();
    let deleted = 0;
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix: 'feedback:', cursor });
      const raws = await Promise.all(page.keys.map(k => kv.get(k.name).then(v => ({ key: k.name, v }))));
      for (const { key, v } of raws) {
        if (!v) continue;
        try {
          const obj = JSON.parse(v);
          if (obj.t && Date.parse(obj.t) < cutoff) {
            await kv.delete(key);
            deleted++;
          }
        } catch { continue; }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    logEvent('feedback_drained', { deleted: String(deleted), before });
    return c.json({ ok: true, deleted });
  });

  // Factory trigger fires this at JOB 0 (proves the trigger fired). Health digest alerts if missing.
  app.post('/admin/cron/factory_autoloop_marker', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);
    const kv = getKV();
    await kv.put('cron:factory_autoloop', JSON.stringify({
      t: new Date().toISOString(),
    }));
    logEvent('factory_autoloop_marker', {});
    return c.json({ ok: true });
  });

  // Factory trigger fires this after JOB 4 completes (proves canon evolution actually ran).
  // Paired with factory_autoloop_marker: if fired is fresh but completed is stale, JOB 4 is silently broken.
  app.post('/admin/cron/factory_completed_marker', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);
    const kv = getKV();
    await kv.put('cron:factory_completed', JSON.stringify({
      t: new Date().toISOString(),
    }));
    logEvent('factory_completed_marker', {});
    return c.json({ ok: true });
  });

  // Manual digest trigger. Scheduled daily at 09:00 UTC, but that's a 24h feedback
  // loop for any digest-logic change. This shortens it: make changes, curl this,
  // read the email / cron:health_digest KV marker. Admin-only.
  //
  // ?email=true sends the alarm email (default: suppressed, so CI smoke can hammer
  // this every 6h without flooding the inbox). Scheduled-cron path always sends.
  app.post('/admin/cron/health-digest', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);
    if (await checkAdminRateLimit('health-digest', 20, 60)) return c.json({ error: 'Rate limited (20/min)' }, 429);
    const sendEmailOnAlarm = c.req.query('email') === 'true';
    await runHealthDigest({ sendEmailOnAlarm });
    const kv = getKV();
    const raw = await kv.get('cron:health_digest');
    return c.json({ ok: true, email_sent: sendEmailOnAlarm, result: raw ? JSON.parse(raw) : null });
  });

  // --- Library signal (RL aggregation for meta trigger) ---

  app.get('/admin/marketplace/library-signal', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);

    // Read window — default last 30 days, configurable
    const days = parseInt(c.req.query('days') || '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const db = getDB();

      // Per-author aggregate: what they published, what engagement they got
      const publishEvents = await db.prepare(
        `SELECT author_id, event, meta, created_at FROM access_log
         WHERE event LIKE 'publish_%' AND created_at > ? ORDER BY created_at`
      ).bind(since).all();

      const engagementEvents = await db.prepare(
        `SELECT author_id, event, COUNT(*) as count FROM access_log
         WHERE event NOT LIKE 'publish_%' AND created_at > ?
         GROUP BY author_id, event ORDER BY count DESC`
      ).bind(since).all();

      // Quiz outcomes — score distribution is RL signal
      const quizOutcomes = await db.prepare(
        `SELECT q.author_id, qr.quiz_id, qr.score_pct, qr.taken_at
         FROM quiz_results qr
         JOIN quizzes q ON qr.quiz_id = q.id
         WHERE qr.taken_at > ?
         ORDER BY qr.taken_at`
      ).bind(since).all();

      // Referral conversions — which artifacts drove signups
      const referrals = await db.prepare(
        `SELECT author_id, source_type, COUNT(*) as count FROM referrals
         WHERE created_at > ? GROUP BY author_id, source_type`
      ).bind(since).all();

      // Event distribution — the marketplace determines which patterns matter
      const funnelCounts = await db.prepare(
        `SELECT event, COUNT(*) as count, COUNT(DISTINCT author_id) as authors,
                COUNT(DISTINCT accessor_id) as unique_accessors
         FROM access_log WHERE created_at > ?
         GROUP BY event ORDER BY count DESC`
      ).bind(since).all();

      // Build unstructured text for Opus to interpret
      const lines: string[] = [
        `# Library RL Signal — last ${days} days (since ${since.slice(0, 10)})`,
        '',
        '## Funnel Overview',
      ];

      for (const row of (funnelCounts.results || []) as Array<{ event: string; count: number; authors: number; unique_accessors: number }>) {
        lines.push(`- ${row.event}: ${row.count} events, ${row.authors} authors, ${row.unique_accessors} unique accessors`);
      }

      // Per-author publishing patterns
      const authorPublishes: Record<string, Array<{ event: string; meta: string | null; at: string }>> = {};
      for (const row of (publishEvents.results || []) as Array<{ author_id: string; event: string; meta: string | null; created_at: string }>) {
        if (!authorPublishes[row.author_id]) authorPublishes[row.author_id] = [];
        authorPublishes[row.author_id].push({ event: row.event, meta: row.meta, at: row.created_at });
      }

      // Per-author engagement received (pre-aggregated by SQL)
      const authorEngagement: Record<string, Record<string, number>> = {};
      for (const row of (engagementEvents.results || []) as Array<{ author_id: string; event: string; count: number }>) {
        if (!authorEngagement[row.author_id]) authorEngagement[row.author_id] = {};
        authorEngagement[row.author_id][row.event] = row.count;
      }

      const allAuthors = new Set([...Object.keys(authorPublishes), ...Object.keys(authorEngagement)]);
      if (allAuthors.size > 0) {
        lines.push('', '## Per-Author Signal');
        for (const author of allAuthors) {
          lines.push('', `### ${author}`);
          const pubs = authorPublishes[author] || [];
          if (pubs.length > 0) {
            lines.push('Published:');
            for (const p of pubs) {
              const meta = p.meta ? ` — ${p.meta}` : '';
              lines.push(`  ${p.event} at ${p.at}${meta}`);
            }
          }
          const eng = authorEngagement[author] || {};
          if (Object.keys(eng).length > 0) {
            lines.push('Engagement received:');
            for (const [event, count] of Object.entries(eng)) {
              lines.push(`  ${event}: ${count}`);
            }
          }
        }
      }

      // Quiz score distributions — what correlates with shares/conversions
      const quizResults = (quizOutcomes.results || []) as Array<{ author_id: string; quiz_id: string; score_pct: number }>;
      if (quizResults.length > 0) {
        lines.push('', '## Quiz Score Distribution');
        const byQuiz: Record<string, number[]> = {};
        for (const r of quizResults) {
          const key = `${r.author_id}/${r.quiz_id}`;
          if (!byQuiz[key]) byQuiz[key] = [];
          byQuiz[key].push(r.score_pct);
        }
        for (const [key, scores] of Object.entries(byQuiz)) {
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          const min = Math.min(...scores);
          const max = Math.max(...scores);
          lines.push(`- ${key}: ${scores.length} takes, avg ${avg}%, range ${min}-${max}%`);
        }
      }

      // Referral conversions
      const refs = (referrals.results || []) as Array<{ author_id: string; source_type: string; count: number }>;
      if (refs.length > 0) {
        lines.push('', '## Referral Conversions');
        for (const r of refs) {
          lines.push(`- ${r.author_id}: ${r.count} via ${r.source_type}`);
        }
      }

      lines.push('', '---', 'Raw structural signal. No content. The marketplace interprets patterns and updates canon defaults.');

      const output = lines.join('\n');
      // Cap output — Workers have memory limits, and the meta trigger has context limits
      return c.text(output.slice(0, 50000));
    } catch (err) {
      console.error('[marketplace] library-signal error:', err);
      return c.text('error reading library signal', 500);
    }
  });

  // --- CTO → CEO email channel (any autonomous agent can reach the founder) ---

  app.post('/admin/email', async (c) => {
    if (!await requireAdmin(c)) return c.text('Unauthorized', 403);
    if (await checkAdminRateLimit('admin-email', 10, 60)) return c.json({ error: 'Rate limited (sends emails, capped 10/min)' }, 429);

    const { to, subject, body } = await c.req.json<{ to?: string; subject: string; body: string }>();
    if (!subject || !body) return c.text('missing subject or body', 400);

    let recipientEmail: string;
    if (to) {
      // Look up user by GitHub login
      const accounts = await loadAccounts<AccountStore>();
      const target = Object.values(accounts).find(a => a.github_login === to);
      if (!target?.email) return c.text(`no email found for ${to}`, 404);
      recipientEmail = target.email;
    } else {
      recipientEmail = FOUNDER_EMAIL;
    }

    const html = `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630;">
${body.split('\n').map((line: string) => line.trim() ? `<p style="font-size: 1rem; line-height: 1.9; color: #3d3630; margin: 0 0 1rem;">${line}</p>` : '').join('\n')}
</div>`;

    const result = await sendEmail(recipientEmail, `alexandria. — ${subject}`, html);
    if (!result.ok) return c.json({ ok: false, sent_to: recipientEmail, error: result.error }, 502);
    return c.json({ ok: true, sent_to: recipientEmail });
  });

  // Dashboard removed 2026-04-14. JSON API at /analytics/dashboard remains
  // for tests and autonomous triggers. Health digest email includes issue list.
  // The HTML dashboard was a human-in-the-loop on a maximisation game.
}
