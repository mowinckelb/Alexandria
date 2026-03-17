/**
 * Google Drive read/write for Constitution files.
 *
 * All files live in a designated "Alexandria" folder in the Author's Drive.
 * The server never retains any data — pure pass-through.
 */

import { google, type drive_v3 } from 'googleapis';
import { decrypt } from './crypto.js';

const FOLDER_NAME = 'Alexandria';
const CONSTITUTION_DIR = 'constitution';
const VAULT_DIR = 'vault';
const NOTES_DIR = 'notes';
const SYSTEM_DIR = 'system';

// Cache folder IDs per token to avoid repeated lookups (in-memory, resets on restart)
const folderCache = new Map<string, { rootId: string; constitutionId: string; vaultId: string; notesId: string; systemId: string; expires: number }>();

function getDriveClient(encryptedToken: string): drive_v3.Drive {
  const refreshToken = decrypt(encryptedToken);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2 });
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string> {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const create = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });
  return create.data.id!;
}

async function ensureFolderStructure(drive: drive_v3.Drive, cacheKey: string): Promise<{
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

  const rootId = await findOrCreateFolder(drive, FOLDER_NAME);
  const [constitutionId, vaultId, notesId, systemId] = await Promise.all([
    findOrCreateFolder(drive, CONSTITUTION_DIR, rootId),
    findOrCreateFolder(drive, VAULT_DIR, rootId),
    findOrCreateFolder(drive, NOTES_DIR, rootId),
    findOrCreateFolder(drive, SYSTEM_DIR, rootId),
  ]);
  const result = { rootId, constitutionId, vaultId, notesId, systemId };
  folderCache.set(cacheKey, { ...result, expires: Date.now() + 10 * 60 * 1000 }); // 10 min cache
  return result;
}

async function findFile(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string | null> {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }
  return null;
}

export async function readConstitutionFile(
  encryptedToken: string,
  domain: string,
): Promise<string | null> {
  const drive = getDriveClient(encryptedToken);
  const { constitutionId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const fileId = await findFile(drive, `${domain}.md`, constitutionId);
  if (!fileId) return null;

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' },
  );
  return res.data as string;
}

export async function readAllConstitution(
  encryptedToken: string,
): Promise<Record<string, string>> {
  const drive = getDriveClient(encryptedToken);
  const { constitutionId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));

  // List all files in constitution folder in one API call
  const listRes = await drive.files.list({
    q: `'${constitutionId}' in parents and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive',
  });

  const files = listRes.data.files || [];
  if (files.length === 0) return {};

  // Read all files in parallel
  const reads = files.map(async (f) => {
    const res = await drive.files.get(
      { fileId: f.id!, alt: 'media' },
      { responseType: 'text' },
    );
    const domain = f.name!.replace('.md', '');
    return [domain, res.data as string] as const;
  });

  const entries = await Promise.all(reads);
  return Object.fromEntries(entries);
}

export async function writeConstitutionFile(
  encryptedToken: string,
  domain: string,
  content: string,
): Promise<void> {
  const drive = getDriveClient(encryptedToken);
  const { constitutionId, vaultId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const fileName = `${domain}.md`;

  const existingId = await findFile(drive, fileName, constitutionId);

  if (existingId) {
    // Archive and update in parallel
    const current = await drive.files.get(
      { fileId: existingId, alt: 'media' },
      { responseType: 'text' },
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await Promise.all([
      drive.files.create({
        requestBody: {
          name: `${domain}_${timestamp}.md`,
          parents: [vaultId],
        },
        media: { mimeType: 'text/markdown', body: current.data as string },
      }),
      drive.files.update({
        fileId: existingId,
        media: { mimeType: 'text/markdown', body: content },
      }),
    ]);
  } else {
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [constitutionId],
      },
      media: { mimeType: 'text/markdown', body: content },
    });
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
  const drive = getDriveClient(encryptedToken);
  const { notesId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const fileId = await findFile(drive, `${functionName}.md`, notesId);
  if (!fileId) return null;

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' },
  );
  return res.data as string;
}

export async function writeNotepad(
  encryptedToken: string,
  functionName: string,
  content: string,
): Promise<void> {
  const drive = getDriveClient(encryptedToken);
  const { notesId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const fileName = `${functionName}.md`;
  const existingId = await findFile(drive, fileName, notesId);

  if (existingId) {
    await drive.files.update({
      fileId: existingId,
      media: { mimeType: 'text/markdown', body: content },
    });
  } else {
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [notesId],
      },
      media: { mimeType: 'text/markdown', body: content },
    });
  }
}

export async function readSystemFile(
  encryptedToken: string,
  fileName: string,
): Promise<string | null> {
  const drive = getDriveClient(encryptedToken);
  const { systemId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const fileId = await findFile(drive, `${fileName}.md`, systemId);
  if (!fileId) return null;

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' },
  );
  return res.data as string;
}

export async function appendSystemFile(
  encryptedToken: string,
  fileName: string,
  content: string,
): Promise<void> {
  const drive = getDriveClient(encryptedToken);
  const { systemId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const fullName = `${fileName}.md`;
  const existingId = await findFile(drive, fullName, systemId);

  if (existingId) {
    const current = await drive.files.get(
      { fileId: existingId, alt: 'media' },
      { responseType: 'text' },
    );
    const updated = `${current.data as string}\n\n${content}`;
    await drive.files.update({
      fileId: existingId,
      media: { mimeType: 'text/markdown', body: updated },
    });
  } else {
    await drive.files.create({
      requestBody: {
        name: fullName,
        parents: [systemId],
      },
      media: { mimeType: 'text/markdown', body: content },
    });
  }
}

/**
 * Read all vault captures for a domain (or all domains).
 * Returns array of {domain, timestamp, content} sorted by time.
 * This closes the reprocessing loop: future models read vault
 * captures and promote the best material to Constitution.
 */
export async function readVaultCaptures(
  encryptedToken: string,
  domain?: string,
): Promise<Array<{ name: string; content: string }>> {
  const drive = getDriveClient(encryptedToken);
  const { vaultId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));

  // List vault files, optionally filtered by domain prefix
  const q = domain
    ? `'${vaultId}' in parents and name contains '${domain}_' and trashed=false`
    : `'${vaultId}' in parents and trashed=false`;

  const listRes = await drive.files.list({
    q,
    fields: 'files(id,name,mimeType)',
    spaces: 'drive',
    orderBy: 'name',
  });

  const files = listRes.data.files || [];
  if (files.length === 0) return [];

  // Only read text-based files — skip binary (images, PDFs, etc.)
  const textFiles = files.filter(f => {
    const mime = f.mimeType || '';
    return mime.startsWith('text/') || mime === 'application/json';
  });

  const reads = textFiles.map(async (f) => {
    const res = await drive.files.get(
      { fileId: f.id!, alt: 'media' },
      { responseType: 'text' },
    );
    return { name: f.name!, content: res.data as string };
  });

  // Include non-text files as metadata-only entries so the Engine knows they exist
  const nonTextFiles = files.filter(f => {
    const mime = f.mimeType || '';
    return !mime.startsWith('text/') && mime !== 'application/json';
  });
  const nonTextEntries = nonTextFiles.map(f => ({
    name: f.name!,
    content: `[Binary file — ${f.mimeType || 'unknown type'}. Cannot be read as text. The Author placed this in the Vault; acknowledge it but note it cannot be processed directly.]`,
  }));

  return [...await Promise.all(reads), ...nonTextEntries];
}

/**
 * Write a raw capture directly to the Vault.
 * Liberal capture — zero false negatives. Cost of noise is trivial
 * (bigger MD file). Cost of lost signal is permanent.
 * Future models reprocess the Vault and promote signal to Constitution.
 */
export async function writeVaultCapture(
  encryptedToken: string,
  domain: string,
  content: string,
): Promise<void> {
  const drive = getDriveClient(encryptedToken);
  const { vaultId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${domain}_${timestamp}.md`;

  await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [vaultId],
    },
    media: { mimeType: 'text/markdown', body: content },
  });

  // Record this filename so vault intake knows the server created it
  recordVaultCreated(encryptedToken, fileName).catch((err) => {
    console.error(`[vault] Failed to record vault-created for ${fileName}:`, err);
  });
}

/**
 * List vault files with metadata (name, size, mimeType) without downloading content.
 * Used to detect unprocessed user-dropped files vs tool-created captures.
 */
export async function listVaultFiles(
  encryptedToken: string,
): Promise<Array<{ id: string; name: string; mimeType: string; size: string }>> {
  const drive = getDriveClient(encryptedToken);
  const { vaultId } = await ensureFolderStructure(drive, encryptedToken.slice(0, 16));

  const listRes = await drive.files.list({
    q: `'${vaultId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size)',
    spaces: 'drive',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  return (listRes.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType || 'unknown',
    size: f.size || '0',
  }));
}

/**
 * Read a system tracker file (vault-created or vault-processed).
 * Returns a Set of filenames stored as newline-separated entries.
 */
async function readVaultTracker(
  encryptedToken: string,
  trackerName: string,
): Promise<Set<string>> {
  const content = await readSystemFile(encryptedToken, trackerName);
  if (!content) return new Set();
  return new Set(content.split('\n').map(l => l.trim()).filter(Boolean));
}

/**
 * Append filenames to a system tracker file.
 */
async function appendVaultTracker(
  encryptedToken: string,
  trackerName: string,
  fileNames: string[],
): Promise<void> {
  if (fileNames.length === 0) return;
  await appendSystemFile(encryptedToken, trackerName, fileNames.join('\n'));
}

/**
 * Record a vault filename as server-created.
 * Called by writeVaultCapture so we can distinguish tool-created files
 * from Author-dropped files without pattern matching.
 */
export async function recordVaultCreated(
  encryptedToken: string,
  fileName: string,
): Promise<void> {
  await appendVaultTracker(encryptedToken, 'vault-created', [fileName]);
}

/**
 * Mark vault files as processed (already surfaced to the Engine).
 */
export async function markVaultFilesProcessed(
  encryptedToken: string,
  fileNames: string[],
): Promise<void> {
  await appendVaultTracker(encryptedToken, 'vault-processed', fileNames);
}

/**
 * Detect unprocessed vault files — files the Author dropped directly,
 * not created by the server and not yet surfaced to the Engine.
 *
 * Uses two trackers: vault-created (files the server wrote) and
 * vault-processed (files already surfaced). No pattern matching —
 * zero false negatives guaranteed.
 */
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
  const drive = getDriveClient(encryptedToken);
  await ensureFolderStructure(drive, encryptedToken.slice(0, 16));
}
