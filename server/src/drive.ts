import type { Env, AuthorRecord } from './types.js';
import { CONSTITUTION_DOMAINS } from './types.js';

// --- OAuth token management ---

async function refreshAccessToken(env: Env, authorToken: string, author: AuthorRecord): Promise<string> {
  // Return cached token if still valid (with 5min buffer)
  if (author.googleAccessToken && author.googleTokenExpiry && Date.now() < author.googleTokenExpiry - 300_000) {
    return author.googleAccessToken;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: author.googleRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google token: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };

  // Cache the new access token
  author.googleAccessToken = data.access_token;
  author.googleTokenExpiry = Date.now() + data.expires_in * 1000;
  await env.AUTHORS_KV.put(`author:${authorToken}`, JSON.stringify(author));

  return data.access_token;
}

// --- Drive file operations ---

async function driveRequest(accessToken: string, path: string, options?: RequestInit): Promise<Response> {
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

export async function readFile(accessToken: string, fileId: string): Promise<string> {
  const res = await driveRequest(accessToken, `/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return res.text();
}

export async function writeFile(accessToken: string, fileId: string, content: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/markdown',
    },
    body: content,
  });
  if (!res.ok) throw new Error(`Drive write failed: ${res.status}`);
}

export async function createFile(accessToken: string, name: string, parentId: string, content: string): Promise<string> {
  const metadata = JSON.stringify({
    name,
    mimeType: 'text/markdown',
    parents: [parentId],
  });
  const boundary = 'alexandria_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: text/markdown',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  const data = await res.json() as { id: string };
  return data.id;
}

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) metadata.parents = [parentId];

  const res = await driveRequest(accessToken, '/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) throw new Error(`Drive folder create failed: ${res.status}`);
  const data = await res.json() as { id: string };
  return data.id;
}

async function findFileByName(accessToken: string, name: string, parentId: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name}' and '${parentId}' in parents and trashed=false`);
  const res = await driveRequest(accessToken, `/files?q=${q}&fields=files(id,name)`);
  if (!res.ok) return null;
  const data = await res.json() as { files: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

// --- Constitution structure ---

const DOMAIN_TEMPLATES: Record<string, string> = {};
for (const domain of CONSTITUTION_DOMAINS) {
  DOMAIN_TEMPLATES[domain] = `# ${domain}\n\n*This domain is being built through your conversations. As Alexandria detects signal relevant to your ${domain.toLowerCase()}, it will be structured here.*\n`;
}

const INDEX_TEMPLATE = `# Constitution

*Your sovereign cognitive architecture. These files are yours — human-readable, downloadable, portable to any AI.*

## Domains

- **Worldview** — Core beliefs, epistemology, how you see the world
- **Values** — Non-negotiables, hierarchy, ethical framework
- **Models** — Thinking tools, decision frameworks, mental models
- **Identity** — Self-concept, voice, how you see yourself
- **Taste** — Aesthetic sensibility, creative preferences, quality signals
- **Shadows** — Known blind spots, contradictions, growth edges

*Each domain file grows as Alexandria extracts signal from your conversations. Every entry is timestamped and traceable.*
`;

export async function initializeConstitution(accessToken: string): Promise<{ folderId: string; constitutionFolderId: string }> {
  // Create Alexandria/ folder at Drive root
  const folderId = await createFolder(accessToken, 'Alexandria');

  // Create Alexandria/Constitution/ subfolder
  const constitutionFolderId = await createFolder(accessToken, 'Constitution', folderId);

  // Create index file
  await createFile(accessToken, '_index.md', constitutionFolderId, INDEX_TEMPLATE);

  // Create domain files
  for (const domain of CONSTITUTION_DOMAINS) {
    await createFile(accessToken, `${domain}.md`, constitutionFolderId, DOMAIN_TEMPLATES[domain]);
  }

  return { folderId, constitutionFolderId };
}

// --- High-level operations used by tools ---

export async function getAccessToken(env: Env, authorToken: string, author: AuthorRecord): Promise<string> {
  return refreshAccessToken(env, authorToken, author);
}

export async function getDomainFileId(accessToken: string, constitutionFolderId: string, domain: string): Promise<string | null> {
  return findFileByName(accessToken, `${domain}.md`, constitutionFolderId);
}

export async function listConstitutionFiles(accessToken: string, constitutionFolderId: string): Promise<{ id: string; name: string }[]> {
  const q = encodeURIComponent(`'${constitutionFolderId}' in parents and trashed=false`);
  const res = await driveRequest(accessToken, `/files?q=${q}&fields=files(id,name)&orderBy=name`);
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json() as { files: { id: string; name: string }[] };
  return data.files ?? [];
}

export async function listVaultFiles(accessToken: string, folderId: string): Promise<{ id: string; name: string }[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await driveRequest(accessToken, `/files?q=${q}&fields=files(id,name,mimeType)&orderBy=name`);
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json() as { files: { id: string; name: string }[] };
  return data.files ?? [];
}
