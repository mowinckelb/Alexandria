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
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'alexandria-mcp', version: '0.1.0' });
});

// Serve favicon so Claude picks up the a. logo instead of Railway's default
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="80" fill="#F5F0E8"/>
  <text x="256" y="360" font-family="Georgia, 'Times New Roman', serif" font-size="340" font-weight="bold" fill="#1A1A1A" text-anchor="middle">a.</text>
</svg>`;

app.get('/favicon.ico', (_req, res) => {
  res.type('image/svg+xml').send(ICON_SVG);
});

app.get('/favicon.svg', (_req, res) => {
  res.type('image/svg+xml').send(ICON_SVG);
});

// ---------------------------------------------------------------------------
// MCP endpoint — Streamable HTTP transport
// ---------------------------------------------------------------------------

// Auth middleware: require valid Bearer token on /mcp — forces Claude to do OAuth
app.use('/mcp', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const authInfo = await authProvider.verifyAccessToken(token);
    (req as unknown as Record<string, unknown>).auth = authInfo;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Fresh server per request — McpServer.connect() can only be called once per instance
function createMcpServer() {
  const server = new McpServer({
    name: 'Alexandria',
    version: '0.1.0',
    icons: [{
      src: 'https://mowinckel.ai/icon.svg',
      mimeType: 'image/svg+xml',
    }],
  });
  registerTools(server);
  return server;
}

app.all('/mcp', async (req, res) => {
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
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Alexandria MCP server running on port ${PORT}`);
  console.log(`  OAuth:  ${SERVER_URL}/authorize`);
  console.log(`  MCP:    ${SERVER_URL}/mcp`);
  console.log(`  Health: ${SERVER_URL}/health`);
});
