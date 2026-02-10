/**
 * Job Status API
 * GET /api/jobs/{jobId} - Get status of a processing job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
// GET: Get Job Status
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabase();
    
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Calculate progress percentage
    const progress = job.total_items > 0 
      ? Math.round((job.processed_items / job.total_items) * 100)
      : 0;
    
    // Calculate elapsed time
    let elapsedSeconds: number | null = null;
    if (job.started_at) {
      const startTime = new Date(job.started_at).getTime();
      const endTime = job.completed_at 
        ? new Date(job.completed_at).getTime()
        : Date.now();
      elapsedSeconds = Math.round((endTime - startTime) / 1000);
    }
    
    // Estimate remaining time based on current rate
    let estimatedRemainingSeconds: number | null = null;
    if (job.status === 'running' && elapsedSeconds && job.processed_items > 0) {
      const secondsPerItem = elapsedSeconds / job.processed_items;
      const remainingItems = job.total_items - job.processed_items;
      estimatedRemainingSeconds = Math.round(secondsPerItem * remainingItems);
    }
    
    return NextResponse.json({
      id: job.id,
      userId: job.user_id,
      jobType: job.job_type,
      status: job.status,
      progress: {
        total: job.total_items,
        processed: job.processed_items,
        percentage: progress,
        remaining: job.total_items - job.processed_items
      },
      timing: {
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        elapsedSeconds,
        estimatedRemainingSeconds
      },
      results: job.results || {},
      error: job.error,
      // User-friendly status message
      message: getStatusMessage(job.status, job.processed_items, job.total_items, job.error)
    });
    
  } catch (error) {
    console.error('[JobStatus] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusMessage(
  status: string,
  processed: number,
  total: number,
  error: string | null
): string {
  switch (status) {
    case 'pending':
      return 'Job is queued and waiting to start';
    case 'running':
      return `Processing file ${processed + 1} of ${total}`;
    case 'completed':
      return `Successfully processed ${processed} files`;
    case 'partial':
      return `Completed with some errors: ${processed} of ${total} files processed`;
    case 'failed':
      return error || 'Job failed';
    case 'cancelled':
      return 'Job was cancelled';
    default:
      return `Status: ${status}`;
  }
}
