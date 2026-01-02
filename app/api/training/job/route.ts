import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTrainingTools } from '@/lib/factory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/training/job?jobId=xxx
 * Get the status of a fine-tuning job from Together AI
 * 
 * Also accepts exportId to look up the job from our database:
 * GET /api/training/job?exportId=xxx
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let jobId = searchParams.get('jobId');
  const exportId = searchParams.get('exportId');

  // If exportId provided, look up the jobId from our database
  if (!jobId && exportId) {
    const { data: exportRecord, error } = await supabase
      .from('training_exports')
      .select('training_job_id')
      .eq('id', exportId)
      .single();

    if (error || !exportRecord?.training_job_id) {
      return NextResponse.json({ 
        error: 'Export not found or no training job associated',
        exportId 
      }, { status: 404 });
    }

    jobId = exportRecord.training_job_id;
  }

  if (!jobId) {
    return NextResponse.json({ error: 'jobId or exportId required' }, { status: 400 });
  }

  const { tuner } = getTrainingTools();
  const status = await tuner.getJobStatus(jobId);

  if (!status) {
    return NextResponse.json({ 
      error: 'Failed to get job status from Together AI',
      jobId 
    }, { status: 500 });
  }

  // If job is completed or failed, update our database
  if (status.status === 'completed' || status.status === 'failed') {
    await syncJobStatus(jobId, status);
  }

  return NextResponse.json({
    job_id: status.id,
    status: status.status,
    model: status.model,
    fine_tuned_model: status.fine_tuned_model,
    progress: status.epochs_completed && status.total_epochs 
      ? `${status.epochs_completed}/${status.total_epochs} epochs`
      : status.steps_completed 
        ? `${status.steps_completed} steps`
        : null,
    created_at: status.created_at,
    finished_at: status.finished_at,
    error: status.error,
    // Add instructions based on status
    next_steps: getNextSteps(status.status, status.fine_tuned_model, jobId)
  });
}

/**
 * POST /api/training/job
 * Actions for managing training jobs
 * 
 * Actions:
 * - 'cancel': Cancel a running job
 *   Body: { action: 'cancel', jobId }
 * 
 * - 'activate': Activate a completed fine-tuned model as the Ghost
 *   Body: { action: 'activate', jobId }
 * 
 * - 'sync': Force sync job status from Together AI to our database
 *   Body: { action: 'sync', jobId }
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { action, jobId } = body;

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  const { tuner } = getTrainingTools();

  switch (action) {
    case 'cancel': {
      const success = await tuner.cancelJob(jobId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
      }

      // Update our database
      await supabase
        .from('training_exports')
        .update({ status: 'cancelled' })
        .eq('training_job_id', jobId);

      return NextResponse.json({ success: true, message: 'Job cancelled' });
    }

    case 'activate': {
      // Get job status to find the fine-tuned model
      const status = await tuner.getJobStatus(jobId);
      if (!status) {
        return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
      }

      if (status.status !== 'completed') {
        return NextResponse.json({ 
          error: `Cannot activate: job status is ${status.status}, not completed` 
        }, { status: 400 });
      }

      if (!status.fine_tuned_model) {
        return NextResponse.json({ 
          error: 'No fine-tuned model found in completed job' 
        }, { status: 400 });
      }

      // Find the export record and get userId
      const { data: exportRecord, error: exportError } = await supabase
        .from('training_exports')
        .select('id, user_id')
        .eq('training_job_id', jobId)
        .single();

      if (exportError || !exportRecord) {
        return NextResponse.json({ 
          error: 'Export record not found for this job' 
        }, { status: 404 });
      }

      // Activate the model
      const activationResult = await activateModel(
        exportRecord.user_id,
        exportRecord.id,
        status.fine_tuned_model
      );

      if (!activationResult.success) {
        return NextResponse.json({ 
          error: activationResult.error 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Model activated as Ghost',
        model_id: status.fine_tuned_model,
        user_id: exportRecord.user_id
      });
    }

    case 'sync': {
      const status = await tuner.getJobStatus(jobId);
      if (!status) {
        return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
      }

      await syncJobStatus(jobId, status);

      return NextResponse.json({
        success: true,
        status: status.status,
        synced: true
      });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

/**
 * Sync job status from Together AI to our database
 */
async function syncJobStatus(jobId: string, status: {
  status: string;
  fine_tuned_model?: string;
  error?: string;
}) {
  const updates: Record<string, unknown> = {};

  // Map Together AI status to our status
  switch (status.status) {
    case 'completed':
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
      if (status.fine_tuned_model) {
        updates.resulting_model_id = status.fine_tuned_model;
      }
      break;
    case 'failed':
      updates.status = 'failed';
      break;
    case 'cancelled':
      updates.status = 'cancelled';
      break;
    case 'running':
      updates.status = 'training';
      break;
    case 'queued':
    case 'pending':
      updates.status = 'queued';
      break;
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('training_exports')
      .update(updates)
      .eq('training_job_id', jobId);
  }
}

/**
 * Activate a fine-tuned model as the user's Ghost
 */
async function activateModel(
  userId: string, 
  exportId: string, 
  modelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update the export record
    await supabase
      .from('training_exports')
      .update({ 
        status: 'active',
        resulting_model_id: modelId,
        completed_at: new Date().toISOString()
      })
      .eq('id', exportId);

    // Update or create the twins record
    // First, check if a twins record exists
    const { data: existingTwin } = await supabase
      .from('twins')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingTwin) {
      // Update existing twin
      const { error } = await supabase
        .from('twins')
        .update({ 
          model_id: modelId,
          status: 'active',
          training_job_id: exportId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      // Create new twin
      const { error } = await supabase
        .from('twins')
        .insert({
          user_id: userId,
          model_id: modelId,
          status: 'active',
          training_job_id: exportId
        });

      if (error) throw error;
    }

    console.log(`[Training] Activated model ${modelId} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[Training] Activation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get next steps based on job status
 */
function getNextSteps(status: string, modelId: string | undefined, jobId: string): string {
  switch (status) {
    case 'pending':
    case 'queued':
      return 'Job is queued. Poll this endpoint to check progress.';
    case 'running':
      return 'Training in progress. Poll this endpoint to check completion.';
    case 'completed':
      return modelId 
        ? `Training complete! Run POST /api/training/job with { action: 'activate', jobId: '${jobId}' } to use this model as your Ghost.`
        : 'Training complete but no model ID found. Check Together AI dashboard.';
    case 'failed':
      return 'Training failed. Check the error field for details.';
    case 'cancelled':
      return 'Training was cancelled.';
    default:
      return 'Unknown status.';
  }
}

