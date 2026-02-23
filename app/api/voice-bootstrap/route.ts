/**
 * Voice Bootstrap API
 * Phase 0: Process voice notes to maximize training data quality before Constitution extraction.
 * 
 * POST /api/voice-bootstrap - Start batch processing job
 * GET /api/voice-bootstrap - Get current job status for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const AudioFileSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  context: z.string().optional()
});

const StartJobSchema = z.object({
  userId: z.string().uuid(),
  files: z.array(AudioFileSchema).min(1).max(500).optional(),
  storagePaths: z.array(z.string().min(1)).min(1).max(500).optional(),
  fileUrls: z.array(z.string().url()).min(1).max(500).optional(),
  storagePrefix: z.string().min(1).optional(),
  context: z.string().optional(),
  dryRun: z.boolean().optional()
}).refine((data) => {
  return Boolean(
    (data.files && data.files.length > 0) ||
    (data.storagePaths && data.storagePaths.length > 0) ||
    (data.fileUrls && data.fileUrls.length > 0) ||
    data.storagePrefix
  );
}, {
  message: 'Provide files, storagePaths, fileUrls, or storagePrefix'
});

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(url, key);
}

// ============================================================================
// POST: Start Batch Processing Job
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const parseResult = StartJobSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }
    
    const { userId, storagePaths, fileUrls, storagePrefix, context, dryRun } = parseResult.data;
    const supabase = getSupabase();

    const filesFromPrefix = storagePrefix
      ? await listAudioFilesFromPrefix(supabase, storagePrefix, context)
      : [];

    const filesFromPaths =
      parseResult.data.files ??
      (storagePaths || []).map((path) => ({
        storagePath: path,
        fileName: path.split('/').pop() || path,
        context
      }));
    const filesFromUrls = (fileUrls || []).map((url) =>
      mapUrlToAudioFile(url, context)
    );

    const deduped = new Map<string, { storagePath: string; fileName: string; context?: string }>();
    for (const file of [...filesFromPaths, ...filesFromUrls, ...filesFromPrefix]) {
      deduped.set(file.storagePath, file);
    }
    const finalFiles = [...deduped.values()];
    if (finalFiles.length === 0) {
      return NextResponse.json(
        { error: 'No audio files found for processing' },
        { status: 400 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalFiles: finalFiles.length,
        sample: finalFiles.slice(0, 10)
      });
    }
    
    // Check for existing running queue group
    const { data: existingJobs } = await supabase
      .from('processing_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('job_type', 'voice_bootstrap')
      .in('status', ['pending', 'processing', 'running'])
      .limit(1);
    
    if (existingJobs && existingJobs.length > 0) {
      return NextResponse.json(
        { 
          error: 'Voice bootstrap already in progress'
        },
        { status: 409 }
      );
    }
    
    const batchId = crypto.randomUUID();
    const queuedAt = new Date().toISOString();
    const queueRows = finalFiles.map((file, index) => ({
      user_id: userId,
      storage_path: file.storagePath,
      file_name: file.fileName,
      file_type: inferFileType(file.fileName),
      file_size: 0,
      context: file.context || null,
      status: 'pending',
      progress: 0,
      job_type: 'voice_bootstrap',
      total_items: finalFiles.length,
      processed_items: 0,
      results: {
        bootstrapBatchId: batchId,
        queuedAt,
        queueIndex: index,
        totalInBatch: finalFiles.length
      }
    }));
    const { data: insertedRows, error: queueError } = await supabase
      .from('processing_jobs')
      .insert(queueRows)
      .select('id');
    if (queueError) {
      throw new Error(`Failed to queue voice files: ${queueError.message}`);
    }
    
    console.log(`[VoiceBootstrap] Queued batch ${batchId} with ${finalFiles.length} files`);

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'voice_bootstrap_started',
      summary: `Started voice bootstrap for ${finalFiles.length} files`,
      details: { batchId, totalFiles: finalFiles.length, queuedJobs: insertedRows?.length || 0 },
      requires_attention: false
    });
    
    return NextResponse.json({
      success: true,
      batchId,
      message: `Queued ${finalFiles.length} voice files`,
      totalFiles: finalFiles.length,
      queuedJobs: insertedRows?.length || 0,
      checkStatusUrl: `/api/voice-bootstrap?userId=${userId}`
    });
    
  } catch (error) {
    console.error('[VoiceBootstrap] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function listAudioFilesFromPrefix(
  supabase: ReturnType<typeof getSupabase>,
  storagePrefix: string,
  context?: string
) {
  const normalizedPrefix = storagePrefix.replace(/\/+$/, '');
  const isAudioFile = (name: string) => /\.(mp3|m4a|wav|webm|ogg|flac)$/i.test(name);
  const files: Array<{ storagePath: string; fileName: string; context?: string }> = [];

  // 1) Treat prefix as a folder path first (common case: "<userId>")
  const folderList = await supabase.storage
    .from('carbon-uploads')
    .list(normalizedPrefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (!folderList.error) {
    for (const item of folderList.data || []) {
      if (isAudioFile(item.name)) {
        files.push({
          storagePath: `${normalizedPrefix}/${item.name}`,
          fileName: item.name,
          context
        });
      }
    }
  }

  if (files.length > 0) return files;

  // 2) Fallback: treat prefix as "path prefix"
  const pathParts = normalizedPrefix.split('/');
  const folder = pathParts.slice(0, -1).join('/');
  const searchPrefix = pathParts[pathParts.length - 1];

  const { data, error } = await supabase.storage
    .from('carbon-uploads')
    .list(folder || '', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) {
    throw new Error(`Failed to list files for prefix: ${error.message}`);
  }

  return (data || [])
    .filter((item) => item.name.startsWith(searchPrefix) && isAudioFile(item.name))
    .map((item) => ({
      storagePath: folder ? `${folder}/${item.name}` : item.name,
      fileName: item.name,
      context
    }));
}

// ============================================================================
// GET: Get Current Job Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabase();
    
    // Get recent voice_bootstrap jobs and derive batch status.
    const { data: jobs, error } = await supabase
      .from('processing_jobs')
      .select('id,status,error,results,file_name,created_at,started_at,completed_at')
      .eq('user_id', userId)
      .eq('job_type', 'voice_bootstrap')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error || !jobs || jobs.length === 0) {
      return NextResponse.json({
        hasJob: false,
        message: 'No voice bootstrap job found for this user'
      });
    }

    const latestBatchId = (jobs[0].results as { bootstrapBatchId?: string } | null)?.bootstrapBatchId;
    const batchJobs = latestBatchId
      ? jobs.filter((job) => (job.results as { bootstrapBatchId?: string } | null)?.bootstrapBatchId === latestBatchId)
      : jobs;
    const totalItems = batchJobs.length;
    const completedCount = batchJobs.filter((job) => job.status === 'completed').length;
    const failedCount = batchJobs.filter((job) => job.status === 'failed').length;
    const activeCount = batchJobs.filter((job) => ['pending', 'processing', 'running'].includes(job.status)).length;
    const processedItems = completedCount + failedCount;
    const progress = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;
    const overallStatus =
      activeCount > 0
        ? (batchJobs.some((job) => ['processing', 'running'].includes(job.status)) ? 'running' : 'pending')
        : failedCount === totalItems
          ? 'failed'
          : failedCount > 0
            ? 'partial'
            : 'completed';
    
    return NextResponse.json({
      hasJob: true,
      job: {
        id: latestBatchId || batchJobs[0].id,
        status: overallStatus,
        totalItems,
        processedItems,
        progress,
        failedItems: failedCount,
        createdAt: batchJobs[batchJobs.length - 1]?.created_at,
        startedAt: batchJobs.find((job) => job.started_at)?.started_at || null,
        completedAt: overallStatus === 'completed' || overallStatus === 'failed' || overallStatus === 'partial'
          ? batchJobs[0]?.completed_at || null
          : null
      }
    });
    
  } catch (error) {
    console.error('[VoiceBootstrap] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function mapUrlToAudioFile(url: string, context?: string) {
  const parsed = new URL(url);
  const marker = '/storage/v1/object/';
  const idx = parsed.pathname.indexOf(marker);
  if (idx === -1) {
    throw new Error(`Unsupported fileUrl format: ${url}`);
  }
  const objectPath = parsed.pathname.slice(idx + marker.length);
  const parts = objectPath.split('/').filter(Boolean);
  if (parts.length < 3) {
    throw new Error(`Invalid storage object URL: ${url}`);
  }
  const bucket = parts[1];
  if (bucket !== 'carbon-uploads') {
    throw new Error(`Unsupported bucket in fileUrl: ${bucket}`);
  }
  const storagePath = parts.slice(2).join('/');
  return {
    storagePath,
    fileName: storagePath.split('/').pop() || storagePath,
    context
  };
}

function inferFileType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  return 'audio/mpeg';
}
