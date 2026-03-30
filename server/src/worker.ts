/**
 * Alexandria Server — Cloudflare Workers entry point
 *
 * Stateless server implementing the Blueprint — Alexandria's layer of intent.
 * Serves methodology to prosumer hooks. Stores nothing user-specific.
 */

import { Hono } from 'hono';
import { registerProsumerRoutes, updateAccountBilling, getBillingSummary, runFollowupCheck, runHealthDigest } from './prosumer.js';
import { registerBillingRoutes } from './billing.js';
import { getAnalytics, getEventLog, getDashboard } from './analytics.js';
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
// Health check
// ---------------------------------------------------------------------------

app.get('/health', async (c) => {
  const checks: Record<string, string> = {};

  // Check KV is accessible
  try {
    const env = c.env as Record<string, unknown>;
    const kv = env.DATA as KVNamespace;
    await kv.put('.health-probe', 'ok');
    await kv.delete('.health-probe');
    checks.kv = 'ok';
  } catch {
    checks.kv = 'error — KV not accessible';
  }

  checks.encryption_key = process.env.ENCRYPTION_KEY ? 'ok' : 'missing';
  checks.stripe = process.env.STRIPE_SECRET_KEY ? 'ok' : 'not configured';

  const healthy = checks.kv === 'ok' && checks.encryption_key === 'ok';

  return c.json({
    status: healthy ? 'ok' : 'degraded',
    server: 'alexandria',
    version: '0.3.0',
    runtime: 'cloudflare-workers',
    checks,
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
<p style="color:#888;font-size:0.9rem">Sovereign cognitive transformation layer</p>
<p style="color:#555;font-size:0.8rem;margin-top:2rem"><a href="/health" style="color:#555">health</a></p>
</div>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// Favicon
// ---------------------------------------------------------------------------

app.get('/favicon.ico', (c) => new Response(null, { status: 204 }));
app.get('/favicon.png', (c) => new Response(null, { status: 204 }));

// ---------------------------------------------------------------------------
// Analytics endpoints
// ---------------------------------------------------------------------------

app.get('/analytics', (c) => {
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

  // Cron Trigger — daily follow-up email check
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

    ctx.waitUntil(Promise.all([runFollowupCheck(), runHealthDigest()]));
  },
};
