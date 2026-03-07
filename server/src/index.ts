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

// ---------------------------------------------------------------------------
// MCP endpoint — Streamable HTTP transport
// ---------------------------------------------------------------------------

app.all('/mcp', async (req, res) => {
  try {
    const server = new McpServer({
      name: 'Alexandria',
      version: '0.1.0',
    });

    registerTools(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on('close', () => {
      transport.close();
      server.close();
    });

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
