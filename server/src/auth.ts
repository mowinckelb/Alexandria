import type { Env, AuthorRecord } from './types.js';
import { initializeConstitution, getAccessToken } from './drive.js';

// Generate a cryptographically random API token for the Author
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Build Google OAuth consent URL
function getOAuthUrl(env: Env, baseUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${baseUrl}/oauth/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Handle the setup page — redirect to Google OAuth
export async function handleSetup(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Generate a state parameter to prevent CSRF
  const state = generateToken().slice(0, 32);
  await env.AUTHORS_KV.put(`oauth_state:${state}`, 'pending', { expirationTtl: 600 });

  return Response.redirect(getOAuthUrl(env, baseUrl, state), 302);
}

// Handle the OAuth callback from Google
export async function handleOAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }

  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  // Verify state
  const storedState = await env.AUTHORS_KV.get(`oauth_state:${state}`);
  if (!storedState) {
    return new Response('Invalid or expired state', { status: 400 });
  }
  await env.AUTHORS_KV.delete(`oauth_state:${state}`);

  // Exchange code for tokens
  const baseUrl = `${url.protocol}//${url.host}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${baseUrl}/oauth/callback`,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token exchange failed: ${text}`, { status: 500 });
  }

  const tokenData = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!tokenData.refresh_token) {
    return new Response('No refresh token received. Please revoke access at https://myaccount.google.com/permissions and try again.', { status: 400 });
  }

  // Initialize Constitution folder structure in the Author's Drive
  const { folderId, constitutionFolderId } = await initializeConstitution(tokenData.access_token);

  // Generate Author API token
  const authorToken = generateToken();

  // Store Author record
  const author: AuthorRecord = {
    googleRefreshToken: tokenData.refresh_token,
    googleAccessToken: tokenData.access_token,
    googleTokenExpiry: Date.now() + tokenData.expires_in * 1000,
    driveFolderId: folderId,
    constitutionFolderId: constitutionFolderId,
    createdAt: new Date().toISOString(),
  };
  await env.AUTHORS_KV.put(`author:${authorToken}`, JSON.stringify(author));

  // Return success page with instructions
  return new Response(successPage(authorToken, baseUrl), {
    headers: { 'Content-Type': 'text/html' },
  });
}

// Resolve the Author from the Authorization header
export async function resolveAuthor(request: Request, env: Env): Promise<{ token: string; author: AuthorRecord } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const data = await env.AUTHORS_KV.get(`author:${token}`);
  if (!data) return null;

  return { token, author: JSON.parse(data) as AuthorRecord };
}

function successPage(token: string, baseUrl: string): string {
  const mcpUrl = `${baseUrl}/mcp`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Alexandria — Setup Complete</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-weight: 400; font-size: 1.4rem; }
    .token { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; word-break: break-all; margin: 12px 0; }
    .step { margin: 20px 0; }
    .step-num { font-weight: 600; }
    .note { color: #666; font-size: 0.9rem; margin-top: 32px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Alexandria — sovereignty activated.</h1>
  <p>Your Constitution folder has been created in Google Drive. You own these files.</p>

  <div class="step">
    <span class="step-num">Step 1.</span> Open Claude — <code>Settings → Connectors → Add connector</code>
  </div>
  <div class="step">
    <span class="step-num">Step 2.</span> Paste this URL:
    <div class="token">${mcpUrl}</div>
  </div>
  <div class="step">
    <span class="step-num">Step 3.</span> Set your authorization token:
    <div class="token">${token}</div>
  </div>
  <div class="step">
    <span class="step-num">Step 4.</span> Done. Every conversation now builds your sovereign Constitution.
  </div>

  <p class="note">Save your token — it is your identity. Your Constitution files are in <code>Google Drive → Alexandria → Constitution</code>. They are markdown. You can read them anytime.</p>
</body>
</html>`;
}
