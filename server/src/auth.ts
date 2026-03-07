/**
 * OAuth provider that proxies to Google.
 *
 * Claude's MCP connector expects standard OAuth discovery endpoints.
 * We implement OAuthServerProvider, proxying the authorization to Google
 * so the user grants Drive access. The encrypted Google refresh token
 * becomes our access token — server stays stateless.
 */

import { randomUUID } from 'crypto';
import { google } from 'googleapis';
import type { Response } from 'express';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokenRevocationRequest, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { encrypt, decrypt } from './crypto.js';

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SERVER_URL}/oauth/callback`,
  );
}

// ---------------------------------------------------------------------------
// In-memory stores (stateless server — these reset on restart, which is fine
// because tokens are self-contained encrypted blobs)
// ---------------------------------------------------------------------------

// Registered OAuth clients (Claude registers dynamically)
class AlexandriaClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  async getClient(clientId: string) {
    return this.clients.get(clientId);
  }

  async registerClient(client: OAuthClientInformationFull) {
    this.clients.set(client.client_id, client);
    return client;
  }
}

// Pending authorization codes (short-lived, in-memory)
interface PendingAuth {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  googleRefreshToken?: string;
}

const pendingCodes = new Map<string, PendingAuth>();

// Active tokens (maps our access token to auth info)
const activeTokens = new Map<string, { encryptedGoogleToken: string; clientId: string; expiresAt: number }>();

// ---------------------------------------------------------------------------
// OAuth Provider
// ---------------------------------------------------------------------------

export class AlexandriaOAuthProvider implements OAuthServerProvider {
  clientsStore = new AlexandriaClientsStore();

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    // Generate a temporary code and store the pending auth
    const tempState = randomUUID();
    pendingCodes.set(tempState, { client, params });

    // Redirect to Google's consent screen
    const oauth2 = getOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: tempState,
    });

    res.redirect(url);
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const pending = pendingCodes.get(authorizationCode);
    if (!pending) throw new Error('Invalid authorization code');
    return pending.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const pending = pendingCodes.get(authorizationCode);
    if (!pending) throw new Error('Invalid authorization code');
    if (pending.client.client_id !== client.client_id) {
      throw new Error('Authorization code was not issued to this client');
    }
    if (!pending.googleRefreshToken) {
      throw new Error('Google refresh token not available');
    }

    pendingCodes.delete(authorizationCode);

    // Encrypt the Google refresh token — this is our access token
    const encryptedToken = encrypt(pending.googleRefreshToken);
    const expiresAt = Date.now() + 365 * 24 * 3600 * 1000; // 1 year

    activeTokens.set(encryptedToken, {
      encryptedGoogleToken: encryptedToken,
      clientId: client.client_id,
      expiresAt,
    });

    return {
      access_token: encryptedToken,
      token_type: 'bearer',
      expires_in: 365 * 24 * 3600,
      refresh_token: encryptedToken, // same token, it's self-contained
    };
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    // Validate that the Google refresh token still works before returning it
    try {
      const googleRefreshToken = decrypt(refreshToken);
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      oauth2.setCredentials({ refresh_token: googleRefreshToken });
      await oauth2.getAccessToken(); // throws if revoked
    } catch {
      throw new Error('Google token revoked — re-authentication required');
    }

    return {
      access_token: refreshToken,
      token_type: 'bearer',
      expires_in: 365 * 24 * 3600,
      refresh_token: refreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // Verify by attempting to decrypt — if it decrypts, it's valid
    try {
      decrypt(token);
      return {
        token,
        clientId: 'alexandria',
        scopes: ['mcp:tools'],
      };
    } catch {
      throw new Error('Invalid or expired token');
    }
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    _request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    // No-op — token is self-contained, nothing to revoke server-side
  }
}

// ---------------------------------------------------------------------------
// Google OAuth callback — receives the Google auth code, exchanges for tokens,
// then redirects back to Claude with our authorization code
// ---------------------------------------------------------------------------

import type { Router } from 'express';

export function registerGoogleCallbackRoute(router: Router) {
  router.get('/oauth/callback', async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      res.status(400).send('Missing code or state');
      return;
    }

    const pending = pendingCodes.get(state);
    if (!pending) {
      res.status(400).send('Invalid state — authorization expired. Please try again.');
      return;
    }

    try {
      // Exchange Google auth code for tokens
      const oauth2 = getOAuth2Client();
      const { tokens } = await oauth2.getToken(code);

      if (!tokens.refresh_token) {
        res.status(400).send('No refresh token received. Please revoke access at myaccount.google.com/permissions and try again.');
        return;
      }

      // Store the Google refresh token on the pending auth
      pending.googleRefreshToken = tokens.refresh_token;

      // Generate our authorization code (reuse the state as the code)
      const authCode = state;

      // Redirect back to Claude with our authorization code
      const redirectUri = pending.params.redirectUri;
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('code', authCode);
      if (pending.params.state) {
        targetUrl.searchParams.set('state', pending.params.state);
      }

      res.redirect(targetUrl.toString());
    } catch (err) {
      console.error('Google OAuth error:', err);
      res.status(500).send('Authentication failed. Please try again.');
    }
  });
}
