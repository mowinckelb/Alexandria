import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Env } from './types.js';
import { registerTools } from './tools.js';
import { handleSetup, handleOAuthCallback, resolveAuthor } from './auth.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
        },
      });
    }

    // --- Auth routes ---
    if (url.pathname === '/setup') {
      return handleSetup(request, env);
    }
    if (url.pathname === '/oauth/callback') {
      return handleOAuthCallback(request, env);
    }

    // --- Health check ---
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('Alexandria MCP Server — sovereignty layer active.', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // --- MCP endpoint ---
    if (url.pathname === '/mcp') {
      // Resolve Author from Bearer token
      const resolved = await resolveAuthor(request, env);
      if (!resolved) {
        return new Response('Unauthorized. Visit /setup to connect your Google Drive.', { status: 401 });
      }

      // Create a fresh server + transport per request (stateless mode)
      const server = new McpServer({
        name: 'Alexandria',
        version: '0.1.0',
      });

      registerTools(server, async () => resolved, env);

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true,
      });

      await server.connect(transport);

      const response = await transport.handleRequest(request);

      // Add CORS headers
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
