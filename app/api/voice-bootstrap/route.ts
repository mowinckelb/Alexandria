/**
 * Voice Bootstrap API
 * Phase 0: Process voice notes to maximize training data quality before Constitution extraction.
 * 
 * POST /api/voice-bootstrap - Start batch processing job
 * GET /api/voice-bootstrap - Get current job status for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVoiceProcessor } from '@/lib/factory';
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
  storagePrefix: z.string().min(1).optional(),
  context: z.string().optional(),
  dryRun: z.boolean().optional()
}).refine((data) => {
  return Boolean(
    (data.files && data.files.length > 0) ||
    (data.storagePaths && data.storagePaths.length > 0) ||
    data.storagePrefix
  );
}, {
  message: 'Provide files, storagePaths, or storagePrefix'
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
    
    const { userId, storagePaths, storagePrefix, context, dryRun } = parseResult.data;
    const supabase = getSupabase();

    const filesFromPrefix = storagePrefix
      ? await listAudioFilesFromPrefix(supabase, storagePrefix, context)
      : [];

    const files =
      parseResult.data.files ??
      (storagePaths || []).map((path) => ({
        storagePath: path,
        fileName: path.split('/').pop() || path,
        context
      }));

    const deduped = new Map<string, { storagePath: string; fileName: string; context?: string }>();
    for (const file of [...files, ...filesFromPrefix]) {
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
    
    // Check for existing running job
    const { data: existingJob } = await supabase
      .from('processing_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .eq('job_type', 'voice_bootstrap')
      .in('status', ['pending', 'running'])
      .single();
    
    if (existingJob) {
      return NextResponse.json(
        { 
          error: 'Job already in progress',
          jobId: existingJob.id,
          status: existingJob.status
        },
        { status: 409 }
      );
    }
    
    const voiceProcessor = getVoiceProcessor();
    
    // Create job record
    const jobId = await voiceProcessor.createJob(userId, 'voice_bootstrap', finalFiles.length);
    
    console.log(`[VoiceBootstrap] Starting job ${jobId} with ${finalFiles.length} files`);

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'voice_bootstrap_started',
      summary: `Started voice bootstrap for ${finalFiles.length} files`,
      details: { jobId, totalFiles: finalFiles.length },
      requires_attention: false
    });
    
    // Start processing in background (non-blocking)
    // Note: In production, this should be a queue job (Vercel Functions timeout at 10s-60s)
    // For now, we process synchronously but return immediately with job ID
    processInBackground(voiceProcessor, finalFiles, userId, jobId);
    
    return NextResponse.json({
      success: true,
      jobId,
      message: `Processing ${finalFiles.length} voice files`,
      totalFiles: finalFiles.length,
      checkStatusUrl: `/api/jobs/${jobId}`
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
    
    // Get most recent voice_bootstrap job for user
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('job_type', 'voice_bootstrap')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !job) {
      return NextResponse.json({
        hasJob: false,
        message: 'No voice bootstrap job found for this user'
      });
    }
    
    return NextResponse.json({
      hasJob: true,
      job: {
        id: job.id,
        status: job.status,
        totalItems: job.total_items,
        processedItems: job.processed_items,
        progress: job.total_items > 0 
          ? Math.round((job.processed_items / job.total_items) * 100)
          : 0,
        results: job.results,
        error: job.error,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at
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

// ============================================================================
// Background Processing
// ============================================================================

/**
 * Process files in background
 * Note: This is a simplified version. In production, use:
 * - Vercel Queue or similar for long-running jobs
 * - Webhook callbacks for progress updates
 * - Chunked processing with state persistence
 */
async function processInBackground(
  voiceProcessor: ReturnType<typeof getVoiceProcessor>,
  files: Array<{ storagePath: string; fileName: string; context?: string }>,
  userId: string,
  jobId: string
) {
  try {
    await voiceProcessor.processBatch(files, userId, jobId);
    console.log(`[VoiceBootstrap] Job ${jobId} completed`);
  } catch (error) {
    console.error(`[VoiceBootstrap] Job ${jobId} failed:`, error);
    
    // Mark job as failed
    const supabase = getSupabase();
    await supabase
      .from('processing_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}
