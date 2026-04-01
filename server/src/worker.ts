/**
 * Alexandria Server — Cloudflare Workers entry point
 *
 * Stateless server implementing the Blueprint — Alexandria's layer of intent.
 * Serves methodology to prosumer hooks. Stores nothing user-specific.
 */

import { Hono } from 'hono';
import { registerProsumerRoutes, extractApiKey, findByApiKey, updateAccountBilling, getBillingSummary, runFollowupCheck, runHealthDigest } from './prosumer.js';
import { registerBillingRoutes, settleMonthlyTabs } from './billing.js';
import { registerLibraryRoutes } from './library.js';
import { getAnalytics, getEventLog, getDashboard, logEvent } from './analytics.js';
import { setKV } from './kv.js';

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

const app = new Hono();

// Middleware: populate process.env from Worker bindings + set KV
app.use('*', async (c, next) => {
  const env = c.env as Record<string, unknown>;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }
  // Set KV binding
  if (env.DATA) {
    setKV(env.DATA as KVNamespace);
  }
  // Set D1 + R2 bindings for Library
  if (env.DB) {
    (globalThis as any).__d1 = env.DB;
  }
  if (env.ARTIFACTS) {
    (globalThis as any).__r2 = env.ARTIFACTS;
  }
  await next();
});

// Security headers — all responses
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// CORS for Library API (website at mowinckel.ai calls server at mcp.mowinckel.ai)
app.use('/library/*', async (c, next) => {
  const allowed = ['https://mowinckel.ai', 'https://www.mowinckel.ai'];
  const reqOrigin = c.req.header('Origin') || '';
  if (!allowed.includes(reqOrigin)) {
    if (c.req.method === 'OPTIONS') return c.text('', 403);
    // Non-browser requests (curl, hooks) won't send Origin — let them through without CORS headers
  } else {
    c.header('Access-Control-Allow-Origin', reqOrigin);
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Vary', 'Origin');
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  await next();
});

// ---------------------------------------------------------------------------
// Prosumer API — hooks + local files + Blueprint
// ---------------------------------------------------------------------------

registerProsumerRoutes(app);

// ---------------------------------------------------------------------------
// Billing — Stripe subscription management (conditional)
// ---------------------------------------------------------------------------

registerBillingRoutes(app, updateAccountBilling);

// ---------------------------------------------------------------------------
// Library — Turn 3 (shadows, pulses, quizzes, works)
// ---------------------------------------------------------------------------

registerLibraryRoutes(app);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', async (c) => {
  // Probe KV, D1, R2 — report only aggregate status, no config details
  let healthy = true;

  try {
    const env = c.env as Record<string, unknown>;
    const kv = env.DATA as KVNamespace;
    await kv.put('.health-probe', 'ok');
    await kv.delete('.health-probe');
  } catch { healthy = false; }

  try {
    const env = c.env as Record<string, unknown>;
    const db = env.DB as D1Database | undefined;
    if (db) await db.prepare('SELECT 1').first();
  } catch { healthy = false; }

  if (!process.env.ENCRYPTION_KEY) healthy = false;

  return c.json({
    status: healthy ? 'ok' : 'degraded',
    server: 'alexandria',
    version: '0.4.0',
  });
});

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Alexandria</title>
<link rel="icon" type="image/png" href="/favicon.png">
</head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff">
<div style="text-align:center">
<h1 style="margin:1rem 0 0.5rem;font-weight:300">Alexandria</h1>
<p style="color:#888;font-size:0.9rem">Greek philosophy infrastructure</p>
<p style="color:#555;font-size:0.8rem;margin-top:2rem"><a href="/health" style="color:#555">health</a></p>
</div>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

const waitlistRateMap = new Map<string, { count: number; resetAt: number }>();

app.post('/waitlist', async (c) => {
  // CORS for website
  const reqOrigin = c.req.header('Origin') || '';
  const allowed = ['https://mowinckel.ai', 'https://www.mowinckel.ai'];
  if (allowed.includes(reqOrigin)) {
    c.header('Access-Control-Allow-Origin', reqOrigin);
  }

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = waitlistRateMap.get(ip);
  if (entry && now <= entry.resetAt && entry.count >= 5) {
    return c.json({ error: 'Too many requests.' }, 429);
  }
  if (!entry || now > entry.resetAt) {
    waitlistRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
  }

  const body = await c.req.json().catch(() => null);
  const email = body?.email;
  if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
    return c.json({ error: 'Valid email required.' }, 400);
  }

  const validTypes = ['author', 'investor'];
  const type = validTypes.includes(body.type) ? body.type : 'author';
  const source = body.source === 'confidential' ? 'confidential' : 'public';

  try {
    const db = (globalThis as any).__d1 as D1Database;
    if (!db) {
      return c.json({ error: 'Database not available.' }, 503);
    }
    await db.prepare(
      'INSERT OR REPLACE INTO waitlist (email, type, source, created_at) VALUES (?, ?, ?, ?)'
    ).bind(email.toLowerCase().trim(), type, source, new Date().toISOString()).run();

    logEvent('waitlist_signup', { type, source });
    return c.json({ ok: true });
  } catch (err: any) {
    console.error('Waitlist error:', err?.message || err);
    return c.json({ error: 'Failed to join waitlist.' }, 500);
  }
});

// CORS preflight for waitlist (website calls cross-origin)
app.options('/waitlist', (c) => {
  const reqOrigin = c.req.header('Origin') || '';
  const allowed = ['https://mowinckel.ai', 'https://www.mowinckel.ai'];
  if (allowed.includes(reqOrigin)) {
    c.header('Access-Control-Allow-Origin', reqOrigin);
    c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  return c.text('', 204);
});

// ---------------------------------------------------------------------------
// Favicon
// ---------------------------------------------------------------------------

app.get('/favicon.ico', (c) => new Response(null, { status: 204 }));
app.get('/favicon.png', (c) => new Response(null, { status: 204 }));

// ---------------------------------------------------------------------------
// Analytics endpoints
// ---------------------------------------------------------------------------

// Auth gate for analytics — require valid API key
async function requireAuth(c: any, next: any) {
  const key = extractApiKey(c);
  if (!key) return c.json({ error: 'Unauthorized' }, 401);
  const account = await findByApiKey(key);
  if (!account) return c.json({ error: 'Unauthorized' }, 401);
  await next();
}
app.use('/analytics', requireAuth);
app.use('/analytics/*', requireAuth);

app.get('/analytics', async (c) => {
  return c.json(getAnalytics());
});

app.get('/analytics/log', async (c) => {
  const log = await getEventLog();
  return c.text(log || 'No events logged yet.');
});

app.get('/analytics/dashboard', async (c) => {
  const dashboard = await getDashboard();
  const billing = await getBillingSummary();
  return c.json({ ...dashboard, billing });
});

// ---------------------------------------------------------------------------
// Export for Cloudflare Workers
// ---------------------------------------------------------------------------

export default {
  fetch: app.fetch,

  // Cron Triggers — daily follow-up + monthly settlement
  async scheduled(event: ScheduledEvent, env: Record<string, unknown>, ctx: ExecutionContext) {
    // Populate env
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') {
        process.env[key] = value;
      }
    }
    if (env.DATA) {
      setKV(env.DATA as KVNamespace);
    }
    if (env.DB) {
      (globalThis as any).__d1 = env.DB;
    }
    if (env.ARTIFACTS) {
      (globalThis as any).__r2 = env.ARTIFACTS;
    }

    // Daily cron (0 9 * * *) + monthly settlement (0 2 1 * *)
    // Settlement is idempotent so running on every cron trigger is safe
    ctx.waitUntil(Promise.all([runFollowupCheck(), runHealthDigest(), settleMonthlyTabs()]))
  },
};
