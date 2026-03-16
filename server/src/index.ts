/**
 * Alexandria MCP Server
 *
 * A stateless MCP server that implements the Blueprint — Alexandria's
 * layer of intent. Connects to the Author's Google Drive via OAuth.
 * Stores nothing. Retains nothing. Pure pass-through.
 *
 * The tool descriptions are the product. Everything else is plumbing.
 */

import 'dotenv/config';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { registerTools } from './tools.js';
import { AlexandriaOAuthProvider, registerGoogleCallbackRoute } from './auth.js';
import { initializeFolderStructure } from './drive.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// OAuth — MCP-standard auth endpoints + Google callback
// ---------------------------------------------------------------------------

const authProvider = new AlexandriaOAuthProvider();

app.use(mcpAuthRouter({
  provider: authProvider,
  issuerUrl: new URL(SERVER_URL),
  scopesSupported: ['mcp:tools'],
}));

registerGoogleCallbackRoute(app);

// ---------------------------------------------------------------------------
// General compounding — persistent event log
// ---------------------------------------------------------------------------
// Append-only JSONL log of anonymous tool events. No user data, no content.
// This is the raw material for general compounding: a model reads the log,
// sees patterns, suggests Blueprint improvements. As models improve, they
// extract more from the same log. Bitter lesson.

import { getAnalytics, getEventLog, getDashboard } from './analytics.js';

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'alexandria-mcp', version: '0.1.0' });
});

// Serve favicon so Claude picks up the a. logo
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const faviconPng = readFileSync(join(__dirname, '..', 'favicon.png'));

app.get('/favicon.ico', (_req, res) => {
  res.type('image/png').send(faviconPng);
});

app.get('/favicon.png', (_req, res) => {
  res.type('image/png').send(faviconPng);
});

// ---------------------------------------------------------------------------
// MCP endpoint — Streamable HTTP transport
// ---------------------------------------------------------------------------

// Fresh server per request — McpServer.connect() can only be called once per instance
function createMcpServer() {
  const server = new McpServer({
    name: 'Alexandria',
    version: '0.1.0',
    icons: [{
      src: `${SERVER_URL}/favicon.png`,
      mimeType: 'image/png',
    }],
  });
  registerTools(server);
  return server;
}

// MCP endpoint — no middleware auth. Each tool handler checks its own auth.
// The MCP protocol needs initialize, notifications/initialized, and tools/list
// to work without auth during connector setup. Tool calls (tools/call) check
// for Bearer token inside each handler via authInfo.
app.all('/mcp', async (req, res) => {
  // HEAD probe — Claude checks if MCP server exists
  if (req.method === 'HEAD') {
    res.setHeader('MCP-Protocol-Version', '2025-03-26');
    res.status(200).end();
    return;
  }

  // Pass auth info through if present (tools use it for Drive access)
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const authInfo = await authProvider.verifyAccessToken(token);
      (req as unknown as Record<string, unknown>).auth = authInfo;
    } catch {
      // Invalid token — don't block, let the MCP handler deal with it.
      // Tool calls will fail naturally with "Not authenticated."
    }
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ---------------------------------------------------------------------------
// Initialization endpoint — creates folder structure on first connect
// ---------------------------------------------------------------------------

app.post('/initialize', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    await initializeFolderStructure(token);
    res.json({ ok: true, message: 'Alexandria folder created in Google Drive' });
  } catch (err) {
    console.error('Init error:', err);
    res.status(500).json({ error: 'Failed to initialize folder structure' });
  }
});

// ---------------------------------------------------------------------------
// Analytics endpoints — general compounding data
// ---------------------------------------------------------------------------

// Summary counts (fast, in-memory)
app.get('/analytics', (_req, res) => {
  res.json(getAnalytics());
});

// Full event log (JSONL — feed to a model for Blueprint review)
app.get('/analytics/log', async (_req, res) => {
  const log = await getEventLog();
  res.type('text/plain').send(log || 'No events logged yet.');
});

// Monitoring dashboard (founder-facing health proxies — not optimisation targets)
app.get('/analytics/dashboard', async (_req, res) => {
  res.json(await getDashboard());
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alexandria MCP server running on port ${PORT}`);
  console.log(`  OAuth:  ${SERVER_URL}/authorize`);
  console.log(`  MCP:    ${SERVER_URL}/mcp`);
  console.log(`  Health: ${SERVER_URL}/health`);
  console.log(`  Analytics: ${SERVER_URL}/analytics`);
});
