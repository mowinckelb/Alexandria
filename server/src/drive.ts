/**
 * Google Drive read/write for Constitution files.
 *
 * All files live in a designated "Alexandria" folder in the Author's Drive.
 * The server never retains any data — pure pass-through.
 */

import { decrypt } from './crypto.js';
import { logEvent } from './analytics.js';
import {
  getAccessToken,
  driveList,
  driveGetContent,
  driveExport,
  driveCreateFolder,
  driveCreateFile,
  driveUpdateFile,
} from './google.js';

const FOLDER_NAME = 'Alexandria';
const CONSTITUTION_DIR = 'constitution';
const VAULT_DIR = 'vault';
const NOTES_DIR = 'notes';
const SYSTEM_DIR = 'system';

// Cache folder IDs per token to avoid repeated lookups (in-memory, resets on cold start)
const folderCache = new Map<string, { rootId: string; constitutionId: string; vaultId: string; notesId: string; systemId: string; expires: number }>();

async function getToken(encryptedToken: string): Promise<string> {
  const refreshToken = decrypt(encryptedToken);
  return getAccessToken(refreshToken);
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const files = await driveList(accessToken, q, 'files(id)');
  if (files.length > 0) return files[0].id;

  return driveCreateFolder(accessToken, name, parentId);
}

async function ensureFolderStructure(accessToken: string, cacheKey: string): Promise<{
  rootId: string;
  constitutionId: string;
  vaultId: string;
  notesId: string;
  systemId: string;
}> {
  const cached = folderCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  const rootId = await findOrCreateFolder(accessToken, FOLDER_NAME);
  const [constitutionId, vaultId, notesId, systemId] = await Promise.all([
    findOrCreateFolder(accessToken, CONSTITUTION_DIR, rootId),
    findOrCreateFolder(accessToken, VAULT_DIR, rootId),
    findOrCreateFolder(accessToken, NOTES_DIR, rootId),
    findOrCreateFolder(accessToken, SYSTEM_DIR, rootId),
  ]);
  const result = { rootId, constitutionId, vaultId, notesId, systemId };
  folderCache.set(cacheKey, { ...result, expires: Date.now() + 10 * 60 * 1000 }); // 10 min cache
  return result;
}

// Google Docs native files require export, not binary download
const GOOGLE_DOCS_MIME = 'application/vnd.google-apps.document';

async function readFileContent(
  accessToken: string,
  fileId: string,
  mimeType?: string,
): Promise<string> {
  if (mimeType === GOOGLE_DOCS_MIME) {
    return driveExport(accessToken, fileId, 'text/plain');
  }
  return driveGetContent(accessToken, fileId);
}

export async function readConstitutionFile(
  encryptedToken: string,
  domain: string,
): Promise<string | null> {
  const accessToken = await getToken(encryptedToken);
  const { constitutionId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));

  // Search for both .md files and native Google Docs — prefer .md if both exist
  const q = `'${constitutionId}' in parents and trashed=false and (name='${domain}.md' or name='${domain}')`;
  const files = await driveList(accessToken, q, 'files(id,name,mimeType)');
  if (files.length === 0) return null;
  // Prefer .md file over native Google Doc if both exist
  const file = files.find(f => f.name === `${domain}.md`) || files[0];

  return readFileContent(accessToken, file.id, file.mimeType || undefined);
}

export async function readAllConstitution(
  encryptedToken: string,
): Promise<Record<string, string>> {
  const accessToken = await getToken(encryptedToken);
  const { constitutionId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));

  // List all files in constitution folder in one API call
  const files = await driveList(
    accessToken,
    `'${constitutionId}' in parents and trashed=false`,
    'files(id,name,mimeType)',
  );

  if (files.length === 0) return {};

  // Read all files in parallel (handle both .md uploads and native Google Docs)
  const reads = files.map(async (f) => {
    const content = await readFileContent(accessToken, f.id, f.mimeType || undefined);
    const domain = f.name.replace('.md', '');
    return [domain, content] as const;
  });

  const entries = await Promise.all(reads);
  return Object.fromEntries(entries);
}

export async function writeConstitutionFile(
  encryptedToken: string,
  domain: string,
  content: string,
): Promise<void> {
  const accessToken = await getToken(encryptedToken);
  const { constitutionId, vaultId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
  const fileName = `${domain}.md`;

  const existing = await driveList(
    accessToken,
    `name='${fileName}' and '${constitutionId}' in parents and trashed=false`,
    'files(id)',
  );

  if (existing.length > 0) {
    const existingId = existing[0].id;
    // Archive and update in parallel
    const current = await driveGetContent(accessToken, existingId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await Promise.all([
      driveCreateFile(accessToken, `${domain}_${timestamp}.md`, vaultId, current),
      driveUpdateFile(accessToken, existingId, content),
    ]);
  } else {
    await driveCreateFile(accessToken, fileName, constitutionId, content);
  }
}

export async function appendToConstitutionFile(
  encryptedToken: string,
  domain: string,
  newContent: string,
): Promise<void> {
  const existing = await readConstitutionFile(encryptedToken, domain);
  const updated = existing
    ? `${existing}\n\n---\n\n${newContent}`
    : `# ${domain.charAt(0).toUpperCase() + domain.slice(1)}\n\n${newContent}`;
  await writeConstitutionFile(encryptedToken, domain, updated);
}

export async function readNotepad(
  encryptedToken: string,
  functionName: string,
): Promise<string | null> {
  const accessToken = await getToken(encryptedToken);
  const { notesId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
  const files = await driveList(
    accessToken,
    `name='${functionName}.md' and '${notesId}' in parents and trashed=false`,
    'files(id)',
  );
  if (files.length === 0) return null;

  return driveGetContent(accessToken, files[0].id);
}

export async function readAllNotepads(
  encryptedToken: string,
): Promise<Array<{ name: string; content: string }>> {
  const accessToken = await getToken(encryptedToken);
  const { notesId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));

  const files = await driveList(
    accessToken,
    `'${notesId}' in parents and trashed=false and mimeType='text/markdown'`,
    'files(id,name)',
  );

  if (files.length === 0) return [];

  const results = await Promise.all(
    files.map(async (f) => {
      const content = await driveGetContent(accessToken, f.id);
      return { name: f.name.replace(/\.md$/, ''), content };
    }),
  );
  return results.filter(r => r.content);
}

export async function writeNotepad(
  encryptedToken: string,
  functionName: string,
  content: string,
): Promise<void> {
  const accessToken = await getToken(encryptedToken);
  const { notesId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
  const fileName = `${functionName}.md`;
  const existing = await driveList(
    accessToken,
    `name='${fileName}' and '${notesId}' in parents and trashed=false`,
    'files(id)',
  );

  if (existing.length > 0) {
    await driveUpdateFile(accessToken, existing[0].id, content);
  } else {
    await driveCreateFile(accessToken, fileName, notesId, content);
  }
}

export async function readSystemFile(
  encryptedToken: string,
  fileName: string,
): Promise<string | null> {
  const accessToken = await getToken(encryptedToken);
  const { systemId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
  const files = await driveList(
    accessToken,
    `name='${fileName}.md' and '${systemId}' in parents and trashed=false`,
    'files(id)',
  );
  if (files.length === 0) return null;

  return driveGetContent(accessToken, files[0].id);
}

export async function appendSystemFile(
  encryptedToken: string,
  fileName: string,
  content: string,
): Promise<void> {
  const accessToken = await getToken(encryptedToken);
  const { systemId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
  const fullName = `${fileName}.md`;
  const existing = await driveList(
    accessToken,
    `name='${fullName}' and '${systemId}' in parents and trashed=false`,
    'files(id)',
  );

  if (existing.length > 0) {
    const current = await driveGetContent(accessToken, existing[0].id);
    const updated = `${current}\n\n${content}`;
    await driveUpdateFile(accessToken, existing[0].id, updated);
  } else {
    await driveCreateFile(accessToken, fullName, systemId, content);
  }
}

/**
 * Read all vault captures for a domain (or all domains).
 */
export async function readVaultCaptures(
  encryptedToken: string,
  domain?: string,
): Promise<Array<{ name: string; content: string }>> {
  const accessToken = await getToken(encryptedToken);
  const { vaultId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));

  const q = domain
    ? `'${vaultId}' in parents and name contains '${domain}_' and trashed=false`
    : `'${vaultId}' in parents and trashed=false`;

  const files = await driveList(accessToken, q, 'files(id,name,mimeType)', { orderBy: 'name' });
  if (files.length === 0) return [];

  // Blacklist known-binary mimeTypes
  const BINARY_PREFIXES = ['image/', 'video/', 'audio/'];
  const BINARY_TYPES = new Set([
    'application/pdf', 'application/zip', 'application/gzip',
    'application/x-tar', 'application/x-7z-compressed',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
  ]);

  const isBinary = (mime: string) =>
    BINARY_PREFIXES.some(p => mime.startsWith(p)) || BINARY_TYPES.has(mime);

  const readable = files.filter(f => !isBinary(f.mimeType || ''));
  const binary = files.filter(f => isBinary(f.mimeType || ''));

  const reads = readable.map(async (f) => {
    const content = await driveGetContent(accessToken, f.id);
    return { name: f.name, content };
  });

  const binaryEntries = binary.map(f => ({
    name: f.name,
    content: `[Binary file — ${f.mimeType || 'unknown type'}. Cannot be read as text. The Author placed this in the Vault; acknowledge it but note it cannot be processed directly.]`,
  }));

  return [...await Promise.all(reads), ...binaryEntries];
}

/**
 * Write a raw capture directly to the Vault.
 */
export async function writeVaultCapture(
  encryptedToken: string,
  domain: string,
  content: string,
): Promise<void> {
  const accessToken = await getToken(encryptedToken);
  const { vaultId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${domain}_${timestamp}.md`;

  await driveCreateFile(accessToken, fileName, vaultId, content);

  // Record this filename so vault intake knows the server created it
  recordVaultCreated(encryptedToken, fileName).catch((err) => {
    console.error(`[vault] Failed to record vault-created for ${fileName}:`, err);
    logEvent('vault_tracker_error', { tracker: 'vault-created', file: fileName, error: String(err) });
  });
}

/**
 * List vault files with metadata without downloading content.
 */
export async function listVaultFiles(
  encryptedToken: string,
): Promise<Array<{ id: string; name: string; mimeType: string; size: string }>> {
  const accessToken = await getToken(encryptedToken);
  const { vaultId } = await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));

  const files = await driveList(
    accessToken,
    `'${vaultId}' in parents and trashed=false`,
    'files(id,name,mimeType,size)',
    { orderBy: 'createdTime desc', pageSize: 100 },
  );

  return files.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType || 'unknown',
    size: f.size || '0',
  }));
}

async function readVaultTracker(
  encryptedToken: string,
  trackerName: string,
): Promise<Set<string>> {
  const content = await readSystemFile(encryptedToken, trackerName);
  if (!content) return new Set();
  return new Set(content.split('\n').map(l => l.trim()).filter(Boolean));
}

async function appendVaultTracker(
  encryptedToken: string,
  trackerName: string,
  fileNames: string[],
): Promise<void> {
  if (fileNames.length === 0) return;
  await appendSystemFile(encryptedToken, trackerName, fileNames.join('\n'));
}

export async function recordVaultCreated(
  encryptedToken: string,
  fileName: string,
): Promise<void> {
  await appendVaultTracker(encryptedToken, 'vault-created', [fileName]);
}

export async function markVaultFilesProcessed(
  encryptedToken: string,
  fileNames: string[],
): Promise<void> {
  await appendVaultTracker(encryptedToken, 'vault-processed', fileNames);
}

export async function getUnprocessedVaultFiles(
  encryptedToken: string,
): Promise<Array<{ id: string; name: string; mimeType: string; size: string }>> {
  const [allFiles, created, processed] = await Promise.all([
    listVaultFiles(encryptedToken),
    readVaultTracker(encryptedToken, 'vault-created'),
    readVaultTracker(encryptedToken, 'vault-processed'),
  ]);

  return allFiles.filter(f =>
    !created.has(f.name) && !processed.has(f.name)
  );
}

export async function initializeFolderStructure(
  encryptedToken: string,
): Promise<void> {
  const accessToken = await getToken(encryptedToken);
  await ensureFolderStructure(accessToken, encryptedToken.slice(0, 16));
}
