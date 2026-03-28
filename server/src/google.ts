/**
 * Minimal Google API wrapper — replaces googleapis package.
 *
 * googleapis is 100MB+ unpacked, far too large for Workers bundle.
 * This module provides the same functionality via direct REST calls.
 * Zero dependencies. Pure fetch.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// ---------------------------------------------------------------------------
// OAuth2 — token management
// ---------------------------------------------------------------------------

// Cache access tokens — avoids a round-trip to Google on every Drive call.
// Google access tokens live 60 min; we cache for 55 min.
const tokenCache = new Map<string, { token: string; expires: number }>();

/** Exchange a refresh token for a short-lived access token (cached). */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const cached = tokenCache.get(refreshToken);
  if (cached && cached.expires > Date.now()) return cached.token;
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token refresh failed (${resp.status}): ${err}`);
  }

  const data = await resp.json() as { access_token: string };
  tokenCache.set(refreshToken, { token: data.access_token, expires: Date.now() + 55 * 60 * 1000 });
  return data.access_token;
}

/** Exchange an authorization code for tokens (used during OAuth callback). */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string }> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Code exchange failed (${resp.status}): ${err}`);
  }

  return await resp.json() as { access_token: string; refresh_token?: string };
}

/** Generate Google OAuth consent URL. */
export function generateAuthUrl(opts: {
  redirectUri: string;
  scopes: string[];
  state: string;
  accessType?: string;
  prompt?: string;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: opts.scopes.join(' '),
    state: opts.state,
    access_type: opts.accessType || 'offline',
    prompt: opts.prompt || 'consent',
  });
  return `${AUTH_URL}?${params}`;
}

// ---------------------------------------------------------------------------
// Drive API — file operations
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
}

interface DriveListResponse {
  files: DriveFile[];
}

/** Auth header helper. */
function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

/** List files matching a query. */
export async function driveList(
  accessToken: string,
  q: string,
  fields: string = 'files(id,name)',
  opts?: { orderBy?: string; pageSize?: number },
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q,
    fields,
    spaces: 'drive',
    ...(opts?.orderBy ? { orderBy: opts.orderBy } : {}),
    ...(opts?.pageSize ? { pageSize: String(opts.pageSize) } : {}),
  });

  const resp = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeaders(accessToken),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive list failed (${resp.status}): ${err}`);
  }

  const data = await resp.json() as DriveListResponse;
  return data.files || [];
}

/** Get file content (binary download). */
export async function driveGetContent(
  accessToken: string,
  fileId: string,
): Promise<string> {
  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive get failed (${resp.status}): ${err}`);
  }

  return await resp.text();
}

/** Export Google Docs native file as plain text. */
export async function driveExport(
  accessToken: string,
  fileId: string,
  mimeType: string = 'text/plain',
): Promise<string> {
  const params = new URLSearchParams({ mimeType });
  const resp = await fetch(`${DRIVE_API}/files/${fileId}/export?${params}`, {
    headers: authHeaders(accessToken),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive export failed (${resp.status}): ${err}`);
  }

  return await resp.text();
}

/** Create a folder. */
export async function driveCreateFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) body.parents = [parentId];

  const resp = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive create folder failed (${resp.status}): ${err}`);
  }

  const data = await resp.json() as { id: string };
  return data.id;
}

/** Create a file with content (multipart upload). */
export async function driveCreateFile(
  accessToken: string,
  name: string,
  parentId: string,
  content: string,
  mimeType: string = 'text/markdown',
): Promise<string> {
  const metadata = JSON.stringify({ name, parents: [parentId] });
  const boundary = '----AlexandriaUpload';

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const resp = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive create file failed (${resp.status}): ${err}`);
  }

  const data = await resp.json() as { id: string };
  return data.id;
}

/** Update existing file content. */
export async function driveUpdateFile(
  accessToken: string,
  fileId: string,
  content: string,
  mimeType: string = 'text/markdown',
): Promise<void> {
  const resp = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': mimeType,
    },
    body: content,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive update failed (${resp.status}): ${err}`);
  }
}
