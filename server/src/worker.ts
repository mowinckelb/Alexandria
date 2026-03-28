/**
 * Alexandria MCP Server — Cloudflare Workers entry point
 *
 * A stateless server that implements the Blueprint — Alexandria's
 * layer of intent. Connects to the Author's Google Drive via OAuth.
 * Stores nothing. Retains nothing. Pure pass-through.
 *
 * The tool descriptions are the product. Everything else is plumbing.
 */

import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './tools.js';
import { registerOAuthRoutes, verifyAccessToken } from './auth.js';
import { initializeFolderStructure } from './drive.js';
import { registerProsumerRoutes, updateAccountBilling, getBillingSummary, runFollowupCheck } from './prosumer.js';
import { registerBillingRoutes } from './billing.js';
import { getAnalytics, getEventLog, getDashboard } from './analytics.js';
import { SHARED_CONTEXT } from './modes.js';
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
// OAuth — MCP-standard auth endpoints + Google callback
// ---------------------------------------------------------------------------

registerOAuthRoutes(app);

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
    server: 'alexandria-mcp',
    version: '0.2.0',
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
// Favicon — served from KV or inline
// ---------------------------------------------------------------------------

// Note: favicon.png needs to be uploaded to KV or served via static assets.
// For now, return a 204 to prevent 404s.
app.get('/favicon.ico', (c) => new Response(null, { status: 204 }));
app.get('/favicon.png', (c) => new Response(null, { status: 204 }));

// ---------------------------------------------------------------------------
// MCP endpoint — Streamable HTTP transport
// ---------------------------------------------------------------------------

function createMcpServer() {
  const server = new McpServer({
    name: 'Alexandria',
    version: '0.2.0',
  });
  registerTools(server);
  return server;
}

/**
 * Workers-compatible MCP transport.
 * Bypasses StreamableHTTPServerTransport (which needs Node HTTP streams)
 * and implements the Transport interface directly.
 */
class WorkerTransport implements Transport {
  private _responseCallback: ((msg: JSONRPCMessage) => void) | null = null;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  async start() {}
  async close() { this.onclose?.(); }

  async send(message: JSONRPCMessage) {
    this._responseCallback?.(message);
  }

  /** Feed a JSON-RPC request in and get the response out. */
  processRequest(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    return new Promise((resolve, reject) => {
      this._responseCallback = resolve;
      this.onerror = reject;
      this.onmessage?.(message);
    });
  }
}

app.all('/mcp', async (c) => {
  try {
    // HEAD probe — Claude checks if MCP server exists
    if (c.req.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'MCP-Protocol-Version': '2025-03-26' },
      });
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }, 400);
    }

    // Parse auth and inject into request context
    const authHeader = c.req.header('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let authInfo: { token: string; clientId: string; scopes: string[] } | undefined;
    if (token) {
      try {
        authInfo = await verifyAccessToken(token);
      } catch { /* Invalid token — tools will return "Not authenticated" */ }
    }

    const server = createMcpServer();
    const transport = new WorkerTransport();
    await server.connect(transport);

    const request = body as JSONRPCMessage;

    // Handle notifications (no id) — fire and forget
    if (!('id' in request)) {
      transport.onmessage?.(request);
      return c.json({}, 202);
    }

    const response = await transport.processRequest(request);
    return c.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ jsonrpc: '2.0', error: { code: -32603, message: msg }, id: null }, 500);
  }
});

// ---------------------------------------------------------------------------
// Initialization endpoint
// ---------------------------------------------------------------------------

app.post('/initialize', async (c) => {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ error: 'Missing bearer token' }, 401);
  }

  try {
    await initializeFolderStructure(token);
    return c.json({ ok: true, message: 'Alexandria folder created in Google Drive' });
  } catch (err) {
    console.error('Init error:', err);
    return c.json({ error: 'Failed to initialize folder structure' }, 500);
  }
});

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

    ctx.waitUntil(runFollowupCheck());
  },
};
