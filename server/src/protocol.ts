/** The Alexandria protocol — incompressible core. */

import type { Hono } from 'hono';
import { requireAuth } from './auth.js';
import { getDB, getR2 } from './db.js';
import { logEvent } from './analytics.js';
import { saveAccount, getKV } from './kv.js';

function r2Key(accountId: string, name: string): string {
  return `protocol/${accountId}/${name}.md`;
}

export function registerProtocol(app: Hono) {

  // ── File obligation ────────────────────────────────────────────

  app.put('/file/:name', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);
    if (!auth.account.github_id) return c.json({ error: 'Account missing github_id' }, 400);

    const name = c.req.param('name');
    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name) || name.length > 64)
      return c.json({ error: 'Invalid name (lowercase alphanumeric + hyphens, max 64)' }, 400);

    const body = await c.req.json().catch(() => null);
    if (!body?.content || typeof body.content !== 'string')
      return c.json({ error: 'content required' }, 400);

    const id = String(auth.account.github_id);
    const now = new Date().toISOString();
    const text = typeof body.text === 'string' ? body.text : null;
    const visibility = ['authors', 'public', 'invite', 'paid'].includes(body.visibility) ? body.visibility : 'authors';

    await getR2().put(r2Key(id, name), body.content);
    await getDB().prepare(
      `INSERT INTO protocol_files (account_id, name, text, visibility, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(account_id, name) DO UPDATE SET
         text = COALESCE(excluded.text, protocol_files.text),
         visibility = excluded.visibility,
         updated_at = excluded.updated_at`
    ).bind(id, name, text, visibility, now).run();

    logEvent('protocol_file_published', {
      author: auth.account.github_login,
      name,
      visibility,
    });

    return c.json({ ok: true });
  });

  // ── Library: read per Author ───────────────────────────────────

  app.get('/library/:id', async (c, next) => {
    const id = c.req.param('id');
    if (!/^\d+$/.test(id)) return next();

    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);

    const { results } = await getDB().prepare(
      'SELECT name, text, visibility, updated_at FROM protocol_files WHERE account_id = ?'
    ).bind(id).all<{ name: string; text: string | null; visibility: string; updated_at: string }>();

    if (!results || results.length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json({ account_id: id, files: results });
  });

  app.get('/library/:id/:name', async (c, next) => {
    const id = c.req.param('id');
    const name = c.req.param('name');
    if (!/^\d+$/.test(id)) return next();

    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);

    const file = await getDB().prepare(
      'SELECT text, visibility, updated_at FROM protocol_files WHERE account_id = ? AND name = ?'
    ).bind(id, name).first<{ text: string | null; visibility: string; updated_at: string }>();
    if (!file) return c.json({ error: 'Not found' }, 404);

    const obj = await getR2().get(r2Key(id, name));
    if (!obj) return c.json({ error: 'Not found' }, 404);

    return c.json({
      account_id: id,
      name,
      text: file.text,
      visibility: file.visibility,
      updated_at: file.updated_at,
      content: await obj.text(),
    });
  });

  // ── Call obligation ────────────────────────────────────────────

  app.post('/call', async (c) => {
    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);
    if (!auth.account.github_id) return c.json({ error: 'Account missing github_id' }, 400);

    // Client version heartbeat — /call is the one authed endpoint every install hits
    // regularly. Header absent means either a pre-header bash shim (real upgrade
    // target) or a non-shim client (Claude Desktop/web MCP — node UA — legitimate,
    // never set this header). Split by UA so the stale-shim alarm only fires on
    // the case it can act on.
    const headerVersion = c.req.header('x-alexandria-client');
    const ua = (c.req.header('user-agent') || '').slice(0, 120);
    const clientVersion = headerVersion
      || (ua.toLowerCase().includes('curl') ? 'unset-curl' : 'unset-native');
    const meta: Record<string, string> = {
      author: auth.account.github_login,
      version: clientVersion,
    };
    if (!headerVersion) {
      meta.ip = c.req.header('cf-connecting-ip') || '?';
      meta.ua = ua || '?';
      meta.country = c.req.header('cf-ipcountry') || '?';
    }
    logEvent('client_version_seen', meta);

    // Stale shim signal (curl UA + no header = pre-2026-04-23 install) flows
    // into client_version_seen above. The structural fix is shim self-update
    // from GitHub; nag mail does not solve it.

    // Track first-seen per version. Lets the drift alarm distinguish natural
    // dev-push rollover (resolves in hours) from genuine stuck clients (persist
    // past a newer version). setnx-style: only the first observation wins.
    if (headerVersion) {
      c.executionCtx.waitUntil((async () => {
        try {
          const kv = getKV();
          const key = `version_first_seen:${clientVersion}`;
          if (!(await kv.get(key))) {
            await kv.put(key, new Date().toISOString(), { expirationTtl: 14 * 24 * 60 * 60 });
          }
        } catch (err) { console.error('[version_first_seen] kv write failed:', err); }
      })());
    }

    // Install ground truth: /call firing proves the shim → payload → auth flow
    // works end-to-end. First successful /call per account stamps installed_at.
    // waitUntil so the KV write doesn't add latency to the /call response.
    if (!auth.account.installed_at) {
      auth.account.installed_at = new Date().toISOString();
      const login = auth.account.github_login;
      const accountKey = `github_${auth.account.github_id}`;
      const payload = auth.account as unknown as Record<string, unknown>;
      c.executionCtx.waitUntil(
        saveAccount(accountKey, payload).catch(err => console.error('[install_completed] saveAccount failed:', err))
      );
      logEvent('install_completed', { author: login });
    }

    const body = await c.req.json().catch(() => null);
    if (!body?.modules || !Array.isArray(body.modules))
      return c.json({ error: 'modules required (array of {id, text})' }, 400);

    const id = String(auth.account.github_id);
    const now = new Date().toISOString();
    const db = getDB();

    // Each module: { id: "module_name", text: "why still using / what changed" }
    const rows: { mod: string; text: string }[] = [];
    for (const m of body.modules) {
      if (typeof m === 'object' && m?.id && typeof m.id === 'string' && typeof m.text === 'string') {
        rows.push({ mod: m.id.slice(0, 300), text: m.text.slice(0, 2000) });
      } else if (typeof m === 'string') {
        // Backward compat: bare string = module id with empty text
        rows.push({ mod: m.slice(0, 300), text: '' });
      }
    }
    if (rows.length === 0) return c.json({ error: 'no valid modules' }, 400);

    const inserts = rows.map((r) => db.prepare(
      'INSERT INTO protocol_calls (module_id, account_id, time, text) VALUES (?, ?, ?, ?)'
    ).bind(r.mod, id, now, r.text));
    await db.batch(inserts);
    logEvent('protocol_call', {
      author: auth.account.github_login,
      modules: String(rows.length),
    });

    return c.json({ ok: true });
  });

  // ── Marketplace: browse module usage ───────────────────────────

  app.get('/marketplace', async (c, next) => {
    if (new URL(c.req.url).pathname !== '/marketplace') return next();

    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);

    const { results } = await getDB().prepare(
      'SELECT DISTINCT module_id FROM protocol_calls ORDER BY module_id'
    ).all<{ module_id: string }>();

    return c.json({ modules: (results || []).map(r => r.module_id) });
  });

  app.get('/marketplace/:module', async (c, next) => {
    const module_id = c.req.param('module');
    if (module_id === 'signal') return next();

    const auth = await requireAuth(c);
    if (!auth) return c.text('Unauthorized', 401);

    const { results } = await getDB().prepare(
      'SELECT account_id, time, text FROM protocol_calls WHERE module_id = ? ORDER BY time DESC LIMIT 10000'
    ).bind(module_id).all<{ account_id: string; time: string; text: string | null }>();

    return c.json({ module: module_id, usage: results || [] });
  });
}
