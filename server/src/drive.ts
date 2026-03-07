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

async function ensureFolderStructure(drive: drive_v3.Drive): Promise<{
  rootId: string;
  constitutionId: string;
  vaultId: string;
}> {
  const rootId = await findOrCreateFolder(drive, FOLDER_NAME);
  const constitutionId = await findOrCreateFolder(drive, CONSTITUTION_DIR, rootId);
  const vaultId = await findOrCreateFolder(drive, VAULT_DIR, rootId);
  return { rootId, constitutionId, vaultId };
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
  const { constitutionId } = await ensureFolderStructure(drive);
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
  const { constitutionId } = await ensureFolderStructure(drive);

  const domains = ['worldview', 'values', 'models', 'identity', 'taste', 'shadows'];
  const result: Record<string, string> = {};

  for (const domain of domains) {
    const fileId = await findFile(drive, `${domain}.md`, constitutionId);
    if (fileId) {
      const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' },
      );
      result[domain] = res.data as string;
    }
  }

  return result;
}

export async function writeConstitutionFile(
  encryptedToken: string,
  domain: string,
  content: string,
): Promise<void> {
  const drive = getDriveClient(encryptedToken);
  const { constitutionId, vaultId } = await ensureFolderStructure(drive);
  const fileName = `${domain}.md`;

  const existingId = await findFile(drive, fileName, constitutionId);

  if (existingId) {
    // Archive current version to vault before overwriting
    const current = await drive.files.get(
      { fileId: existingId, alt: 'media' },
      { responseType: 'text' },
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await drive.files.create({
      requestBody: {
        name: `${domain}_${timestamp}.md`,
        parents: [vaultId],
      },
      media: { mimeType: 'text/markdown', body: current.data as string },
    });

    // Update the current file
    await drive.files.update({
      fileId: existingId,
      media: { mimeType: 'text/markdown', body: content },
    });
  } else {
    // Create new file
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

export async function initializeFolderStructure(
  encryptedToken: string,
): Promise<void> {
  const drive = getDriveClient(encryptedToken);
  await ensureFolderStructure(drive);
}
