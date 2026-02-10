/**
 * Vault Utility
 * Abstracts file storage operations for data sovereignty layer.
 * Files stored in Supabase Storage with metadata tracked in vault_files table.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const VAULT_BUCKET = 'carbon-uploads';

// ============================================================================
// Types
// ============================================================================

export interface VaultFile {
  id: string;
  userId: string;
  path: string;
  fileType: 'audio' | 'document' | 'constitution' | 'transcript' | 'other';
  originalName: string | null;
  sizeBytes: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SaveToVaultOptions {
  originalName?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(url, key);
}

// ============================================================================
// Vault Functions
// ============================================================================

/**
 * Save content to Vault (Supabase Storage) and track in database
 * 
 * @param userId - User ID
 * @param path - Path within user's vault (e.g., 'raw/voice/note.m4a')
 * @param content - Buffer or string content to save
 * @param fileType - Type of file for categorization
 * @param options - Additional options (originalName, metadata)
 * @returns Full storage path
 */
export async function saveToVault(
  userId: string,
  path: string,
  content: Buffer | string,
  fileType: VaultFile['fileType'],
  options: SaveToVaultOptions = {}
): Promise<string> {
  const supabase = getSupabase();
  
  // Full path includes userId prefix
  const fullPath = `${userId}/${path}`;
  
  // Convert string to buffer if needed
  const buffer = typeof content === 'string' 
    ? Buffer.from(content, 'utf-8')
    : content;
  
  // Determine content type
  const contentType = getContentType(path, fileType);
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(VAULT_BUCKET)
    .upload(fullPath, buffer, {
      contentType,
      upsert: true // Allow overwriting
    });
  
  if (uploadError) {
    console.error('[Vault] Upload failed:', uploadError);
    throw new Error(`Vault upload failed: ${uploadError.message}`);
  }
  
  // Track in vault_files table (upsert)
  const { error: dbError } = await supabase
    .from('vault_files')
    .upsert({
      user_id: userId,
      path,
      file_type: fileType,
      original_name: options.originalName || null,
      size_bytes: buffer.length,
      metadata: options.metadata || {}
    }, {
      onConflict: 'user_id,path'
    });
  
  if (dbError) {
    console.error('[Vault] Database tracking failed:', dbError);
    // Non-fatal - file is saved, just not tracked
  }
  
  console.log(`[Vault] Saved: ${fullPath} (${formatSize(buffer.length)})`);
  return fullPath;
}

/**
 * Get content from Vault
 * 
 * @param userId - User ID
 * @param path - Path within user's vault
 * @returns Buffer content or null if not found
 */
export async function getFromVault(
  userId: string,
  path: string
): Promise<Buffer | null> {
  const supabase = getSupabase();
  
  const fullPath = `${userId}/${path}`;
  
  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .download(fullPath);
  
  if (error || !data) {
    console.error('[Vault] Download failed:', error);
    return null;
  }
  
  return Buffer.from(await data.arrayBuffer());
}

/**
 * List files in Vault
 * 
 * @param userId - User ID
 * @param pathPrefix - Optional path prefix to filter (e.g., 'raw/voice')
 * @returns Array of VaultFile records
 */
export async function listVaultFiles(
  userId: string,
  pathPrefix?: string
): Promise<VaultFile[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('vault_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (pathPrefix) {
    query = query.like('path', `${pathPrefix}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[Vault] List failed:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    path: row.path,
    fileType: row.file_type,
    originalName: row.original_name,
    sizeBytes: row.size_bytes,
    metadata: row.metadata || {},
    createdAt: row.created_at
  }));
}

/**
 * Delete file from Vault
 * 
 * @param userId - User ID
 * @param path - Path within user's vault
 */
export async function deleteFromVault(
  userId: string,
  path: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const fullPath = `${userId}/${path}`;
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(VAULT_BUCKET)
    .remove([fullPath]);
  
  if (storageError) {
    console.error('[Vault] Storage delete failed:', storageError);
    return false;
  }
  
  // Delete from tracking table
  const { error: dbError } = await supabase
    .from('vault_files')
    .delete()
    .eq('user_id', userId)
    .eq('path', path);
  
  if (dbError) {
    console.error('[Vault] DB delete failed:', dbError);
    // Non-fatal
  }
  
  return true;
}

/**
 * Get download URL for a Vault file (signed, temporary)
 * 
 * @param userId - User ID
 * @param path - Path within user's vault
 * @param expiresIn - Seconds until URL expires (default 3600 = 1 hour)
 */
export async function getVaultDownloadUrl(
  userId: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = getSupabase();
  
  const fullPath = `${userId}/${path}`;
  
  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(fullPath, expiresIn);
  
  if (error || !data) {
    console.error('[Vault] Signed URL failed:', error);
    return null;
  }
  
  return data.signedUrl;
}

// ============================================================================
// Helpers
// ============================================================================

function getContentType(path: string, fileType: VaultFile['fileType']): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  // Audio types
  if (fileType === 'audio') {
    switch (ext) {
      case 'm4a': return 'audio/mp4';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'webm': return 'audio/webm';
      case 'ogg': return 'audio/ogg';
      case 'flac': return 'audio/flac';
      default: return 'audio/mpeg';
    }
  }
  
  // Document types
  if (fileType === 'document') {
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'txt': return 'text/plain';
      case 'md': return 'text/markdown';
      case 'json': return 'application/json';
      default: return 'application/octet-stream';
    }
  }
  
  // Constitution and transcript are markdown/text
  if (fileType === 'constitution' || fileType === 'transcript') {
    return 'text/plain';
  }
  
  return 'application/octet-stream';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ============================================================================
// Constitution-specific helpers (Phase 1)
// ============================================================================

/**
 * Save Constitution to Vault with versioning
 * Creates both a versioned copy and updates the current.md pointer
 * 
 * @param userId - User ID
 * @param version - Constitution version number
 * @param markdown - Constitution content as markdown
 * @param metadata - Additional metadata to store
 */
export async function saveConstitutionToVault(
  userId: string,
  version: number,
  markdown: string,
  metadata: Record<string, unknown> = {}
): Promise<{ versionPath: string; currentPath: string }> {
  // Save versioned copy
  const versionPath = `constitution/v${version}.md`;
  await saveToVault(userId, versionPath, markdown, 'constitution', {
    metadata: { ...metadata, version, type: 'versioned' }
  });
  
  // Update current.md pointer
  const currentPath = 'constitution/current.md';
  await saveToVault(userId, currentPath, markdown, 'constitution', {
    metadata: { ...metadata, version, type: 'current' }
  });
  
  console.log(`[Vault] Saved Constitution v${version} for user ${userId}`);
  
  return { versionPath, currentPath };
}

/**
 * Get Constitution from Vault
 * 
 * @param userId - User ID
 * @param version - Optional specific version (defaults to current)
 * @returns Constitution markdown content or null
 */
export async function getConstitutionFromVault(
  userId: string,
  version?: number
): Promise<string | null> {
  const path = version 
    ? `constitution/v${version}.md`
    : 'constitution/current.md';
  
  const content = await getFromVault(userId, path);
  if (!content) return null;
  
  return content.toString('utf-8');
}

/**
 * List all Constitution versions in Vault
 * 
 * @param userId - User ID
 * @returns Array of version info
 */
export async function listConstitutionVersions(
  userId: string
): Promise<Array<{ version: number; createdAt: string }>> {
  const files = await listVaultFiles(userId, 'constitution/v');
  
  return files
    .filter(f => f.path.match(/constitution\/v\d+\.md$/))
    .map(f => {
      const match = f.path.match(/v(\d+)\.md$/);
      return {
        version: match ? parseInt(match[1], 10) : 0,
        createdAt: f.createdAt
      };
    })
    .sort((a, b) => b.version - a.version);
}
