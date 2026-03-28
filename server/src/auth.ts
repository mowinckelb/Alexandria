/**
 * OAuth provider that proxies to Google.
 *
 * Claude's MCP connector expects standard OAuth discovery endpoints.
 * We implement the MCP OAuth flow, proxying authorization to Google
 * so the user grants Drive access. The encrypted Google refresh token
 * becomes our access token — server stays stateless.
 *
 * Re-implemented without Express/mcpAuthRouter for Hono/Workers.
 */

import { randomUUID } from 'crypto';
import type { Hono } from 'hono';
import { encrypt, decrypt } from './crypto.js';
import { logEvent } from './analytics.js';
import { loadOAuthClients, saveOAuthClients } from './kv.js';
import { generateAuthUrl, exchangeCode, getAccessToken } from './google.js';

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive'];

// ---------------------------------------------------------------------------
// In-memory stores (stateless server — reset on cold start, which is fine
// because tokens are self-contained encrypted blobs)
// ---------------------------------------------------------------------------

interface PendingAuth {
  clientId: string;
  redirectUri: string;
  state?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  googleRefreshToken?: string;
}

const pendingCodes = new Map<string, PendingAuth>();

// ---------------------------------------------------------------------------
// Token operations — shared with MCP endpoint
// ---------------------------------------------------------------------------

export async function verifyAccessToken(token: string): Promise<{ token: string; clientId: string; scopes: string[] }> {
  try {
    decrypt(token);
    return { token, clientId: 'alexandria', scopes: ['mcp:tools'] };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

// ---------------------------------------------------------------------------
// OAuth routes — replaces mcpAuthRouter from MCP SDK
// ---------------------------------------------------------------------------

export function registerOAuthRoutes(app: Hono) {
  // Note: SERVER_URL must be read inside handlers, not at registration time,
  // because process.env is populated by middleware on each request (Workers).
  function getServerUrl() { return process.env.SERVER_URL || 'https://mcp.mowinckel.ai'; }

  // OAuth discovery
  app.get('/.well-known/oauth-authorization-server', (c) => {
    const SERVER_URL = getServerUrl();
    return c.json({
      issuer: SERVER_URL,
      authorization_endpoint: `${SERVER_URL}/authorize`,
      token_endpoint: `${SERVER_URL}/token`,
      registration_endpoint: `${SERVER_URL}/register`,
      scopes_supported: ['mcp:tools'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      code_challenge_methods_supported: ['S256'],
      revocation_endpoint: `${SERVER_URL}/revoke`,
    });
  });

  // Dynamic client registration
  app.post('/register', async (c) => {
    const body = await c.req.json();
    const clientId = randomUUID();
    const clientSecret = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const client = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: now,
      client_name: body.client_name || 'MCP Client',
      redirect_uris: body.redirect_uris || [],
      grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'client_secret_post',
      scope: body.scope || 'mcp:tools',
    };

    // Persist to KV
    const clients = await loadOAuthClients();
    clients[clientId] = client;
    await saveOAuthClients(clients);

    return c.json(client, 201);
  });

  // Authorization — redirects to Google consent
  app.get('/authorize', async (c) => {
    const SERVER_URL = getServerUrl();
    const clientId = c.req.query('client_id');
    const redirectUri = c.req.query('redirect_uri');
    const state = c.req.query('state');
    const codeChallenge = c.req.query('code_challenge');
    const codeChallengeMethod = c.req.query('code_challenge_method') || 'S256';

    if (!clientId || !redirectUri || !codeChallenge) {
      return c.text('Missing required parameters', 400);
    }

    // Verify client exists
    const clients = await loadOAuthClients();
    if (!clients[clientId]) {
      return c.text('Unknown client', 400);
    }

    // Generate temporary state and store pending auth
    const tempState = randomUUID();
    pendingCodes.set(tempState, {
      clientId,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
    });

    // Redirect to Google's consent screen
    const url = generateAuthUrl({
      redirectUri: `${SERVER_URL}/oauth/callback`,
      scopes: GOOGLE_SCOPES,
      state: tempState,
      accessType: 'offline',
      prompt: 'consent',
    });

    return c.redirect(url);
  });

  // Google OAuth callback — exchanges Google code, redirects back to Claude
  app.get('/oauth/callback', async (c) => {
    const SERVER_URL = getServerUrl();
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) {
      return c.text('Missing code or state', 400);
    }

    const pending = pendingCodes.get(state);
    if (!pending) {
      return c.text('Invalid state — authorization expired. Please try again.', 400);
    }

    try {
      const tokens = await exchangeCode(code, `${SERVER_URL}/oauth/callback`);

      if (!tokens.refresh_token) {
        return c.text('No refresh token received. Please revoke access at myaccount.google.com/permissions and try again.', 400);
      }

      // Store the Google refresh token on the pending auth
      pending.googleRefreshToken = tokens.refresh_token;

      // Use state as the authorization code
      const authCode = state;
      const targetUrl = new URL(pending.redirectUri);
      targetUrl.searchParams.set('code', authCode);
      if (pending.state) {
        targetUrl.searchParams.set('state', pending.state);
      }

      return c.redirect(targetUrl.toString());
    } catch (err) {
      console.error('Google OAuth error:', err);
      logEvent('auth_error', { error: String(err) });
      return c.text('Authentication failed. Please try again.', 500);
    }
  });

  // Token exchange
  app.post('/token', async (c) => {
    const body = await c.req.parseBody();
    const grantType = body.grant_type as string;
    const clientId = body.client_id as string;

    if (grantType === 'authorization_code') {
      const authCode = body.code as string;
      const codeVerifier = body.code_verifier as string;

      const pending = pendingCodes.get(authCode);
      if (!pending) {
        return c.json({ error: 'invalid_grant', error_description: 'Invalid authorization code' }, 400);
      }
      if (pending.clientId !== clientId) {
        return c.json({ error: 'invalid_grant', error_description: 'Code was not issued to this client' }, 400);
      }
      if (!pending.googleRefreshToken) {
        return c.json({ error: 'invalid_grant', error_description: 'Google refresh token not available' }, 400);
      }

      // Verify PKCE code_verifier against stored code_challenge
      if (pending.codeChallengeMethod === 'S256' && codeVerifier) {
        const { createHash } = await import('crypto');
        const expected = createHash('sha256')
          .update(codeVerifier)
          .digest('base64url');
        if (expected !== pending.codeChallenge) {
          return c.json({ error: 'invalid_grant', error_description: 'Code verifier mismatch' }, 400);
        }
      }

      pendingCodes.delete(authCode);

      // Encrypt the Google refresh token — this IS our access token
      const encryptedToken = encrypt(pending.googleRefreshToken);

      return c.json({
        access_token: encryptedToken,
        token_type: 'bearer',
        expires_in: 365 * 24 * 3600,
        refresh_token: encryptedToken,
      });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token as string;

      // Validate that the Google refresh token still works
      try {
        const googleRefreshToken = decrypt(refreshToken);
        await getAccessToken(googleRefreshToken);
      } catch (err) {
        logEvent('auth_refresh_failed', { error: String(err) });
        return c.json({ error: 'invalid_grant', error_description: 'Token expired or revoked' }, 400);
      }

      return c.json({
        access_token: refreshToken,
        token_type: 'bearer',
        expires_in: 365 * 24 * 3600,
        refresh_token: refreshToken,
      });
    }

    return c.json({ error: 'unsupported_grant_type' }, 400);
  });

  // Token revocation (no-op — tokens are self-contained)
  app.post('/revoke', (c) => {
    return c.json({ ok: true });
  });
}
