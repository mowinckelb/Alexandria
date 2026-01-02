import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTrainingTools } from '@/lib/factory';

// Force Node.js runtime for file system access
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/training?userId=xxx
 * Returns training stats and readiness for fine-tuning
 */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Total pairs
  const { count: total } = await supabase
    .from('training_pairs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Unexported (available for next training)
  const { count: available } = await supabase
    .from('training_pairs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('export_id', null);

  // High quality available (quality >= 0.6)
  const { count: highQuality } = await supabase
    .from('training_pairs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('export_id', null)
    .gte('quality_score', 0.6);

  // Export history
  const { data: exports } = await supabase
    .from('training_exports')
    .select('id, status, pair_count, created_at, resulting_model_id, training_job_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Current active model
  const { data: activeModel } = await supabase
    .rpc('get_active_model', { p_user_id: userId });

  const availableCount = available || 0;
  return NextResponse.json({
    total: total || 0,
    available: availableCount,
    high_quality: highQuality || 0,
    ready: availableCount >= 100,
    tier: availableCount >= 2000 ? 'optimal' : availableCount >= 500 ? 'good' : availableCount >= 100 ? 'minimum' : 'insufficient',
    active_model: activeModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    recent_exports: exports || [],
    thresholds: { minimum: 100, good: 500, optimal: 2000 }
  });
}

/**
 * POST /api/training
 * 
 * Actions:
 * - 'export' (default): Export JSONL and optionally create export batch record
 *   Body: { userId, minQuality?, createExport? }
 * 
 * - 'start': Full training pipeline - export, upload to Together AI, start fine-tune job
 *   Body: { action: 'start', userId, minQuality?, nEpochs?, lora? }
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { userId, action = 'export' } = body;
  
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Route to appropriate handler
  if (action === 'start') {
    return handleStartTraining(userId, body);
  } else if (action === 'reset_failed') {
    return handleResetFailed(userId);
  } else {
    return handleExport(userId, body);
  }
}

/**
 * Handle 'reset_failed' action - reset pairs from failed exports
 */
async function handleResetFailed(userId: string) {
  // Find failed exports for this user
  const { data: failedExports, error: findError } = await supabase
    .from('training_exports')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['upload_failed', 'training_failed']);

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!failedExports || failedExports.length === 0) {
    return NextResponse.json({ message: 'No failed exports to reset', reset_count: 0 });
  }

  const exportIds = failedExports.map(e => e.id);

  // Reset training pairs from these exports
  const { error: resetError, count } = await supabase
    .from('training_pairs')
    .update({ export_id: null })
    .in('export_id', exportIds);

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  // Delete the failed export records
  await supabase
    .from('training_exports')
    .delete()
    .in('id', exportIds);

  return NextResponse.json({
    success: true,
    reset_count: count || 0,
    exports_deleted: exportIds.length,
    message: `Reset ${count || 0} training pairs from ${exportIds.length} failed exports`
  });
}

/**
 * Handle 'export' action - original functionality
 */
async function handleExport(userId: string, body: { minQuality?: number; createExport?: boolean }) {
  const { minQuality = 0.4, createExport = false } = body;

  // Get unexported pairs above quality threshold
  const { data: pairs, error } = await supabase
    .from('training_pairs')
    .select('id, system_prompt, user_content, assistant_content, quality_score')
    .eq('user_id', userId)
    .is('export_id', null)
    .gte('quality_score', minQuality)
    .order('quality_score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pairs || pairs.length === 0) {
    return NextResponse.json({ count: 0, jsonl: '', message: 'No pairs available' });
  }

  // Generate JSONL
  const jsonl = pairs.map(p => JSON.stringify({
    messages: [
      { role: 'system', content: p.system_prompt },
      { role: 'user', content: p.user_content },
      { role: 'assistant', content: p.assistant_content }
    ]
  })).join('\n');

  let exportId: string | null = null;

  // Create export batch and mark pairs
  if (createExport) {
    // Get current active model for evolution chain
    const { data: baseModel } = await supabase
      .rpc('get_active_model', { p_user_id: userId });

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('training_exports')
      .insert({
        user_id: userId,
        pair_count: pairs.length,
        min_quality_threshold: minQuality,
        base_model_id: baseModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference',
        status: 'exported'
      })
      .select('id')
      .single();

    if (exportError) return NextResponse.json({ error: exportError.message }, { status: 500 });
    
    exportId = exportRecord.id;

    // Link pairs to this export
    const pairIds = pairs.map(p => p.id);
    await supabase
      .from('training_pairs')
      .update({ export_id: exportId })
      .in('id', pairIds);
  }

  return NextResponse.json({
    count: pairs.length,
    jsonl,
    export_id: exportId,
    avg_quality: pairs.reduce((sum, p) => sum + p.quality_score, 0) / pairs.length
  });
}

/**
 * Handle 'start' action - full training pipeline
 * 1. Export JSONL from training_pairs
 * 2. Upload to Together AI
 * 3. Start fine-tuning job
 * 4. Create/update training_exports record
 */
async function handleStartTraining(
  userId: string, 
  body: { 
    minQuality?: number; 
    nEpochs?: number; 
    lora?: boolean;
    loraR?: number;
    loraAlpha?: number;
    learningRate?: number;
    batchSize?: number;
    forceMinimum?: number;  // Allow training with fewer pairs for testing
  }
) {
  const { 
    minQuality = 0.4, 
    nEpochs = 3, 
    lora = true,
    loraR,
    loraAlpha,
    learningRate,
    batchSize,
    forceMinimum
  } = body;

  const { tuner } = getTrainingTools();

  // Step 1: Get unexported pairs above quality threshold
  const { data: pairs, error } = await supabase
    .from('training_pairs')
    .select('id, system_prompt, user_content, assistant_content, quality_score')
    .eq('user_id', userId)
    .is('export_id', null)
    .gte('quality_score', minQuality)
    .order('quality_score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check minimum training data (unless forceMinimum is set for testing)
  const minimumRequired = forceMinimum || 10;
  if (!pairs || pairs.length < minimumRequired) {
    return NextResponse.json({ 
      error: `Insufficient training data. Need at least ${minimumRequired} pairs, have ${pairs?.length || 0}.`,
      available: pairs?.length || 0,
      minimum_required: minimumRequired
    }, { status: 400 });
  }

  // Step 2: Generate JSONL
  const jsonl = pairs.map(p => JSON.stringify({
    messages: [
      { role: 'system', content: p.system_prompt },
      { role: 'user', content: p.user_content },
      { role: 'assistant', content: p.assistant_content }
    ]
  })).join('\n');

  // Step 3: Get current active model for evolution chain
  const { data: baseModel } = await supabase
    .rpc('get_active_model', { p_user_id: userId });
  const baseModelId = baseModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference';

  // Step 4: Create export record (status: 'uploading')
  const { data: exportRecord, error: exportError } = await supabase
    .from('training_exports')
    .insert({
      user_id: userId,
      pair_count: pairs.length,
      min_quality_threshold: minQuality,
      base_model_id: baseModelId,
      status: 'uploading'
    })
    .select('id')
    .single();

  if (exportError) {
    return NextResponse.json({ error: exportError.message }, { status: 500 });
  }

  const exportId = exportRecord.id;

  // Link pairs to this export
  const pairIds = pairs.map(p => p.id);
  await supabase
    .from('training_pairs')
    .update({ export_id: exportId })
    .in('id', pairIds);

  // Step 5: Upload JSONL to Together AI
  const filename = `ghost-${userId.slice(0, 8)}-${Date.now()}.jsonl`;
  const uploadResult = await tuner.upload(jsonl, filename);

  if (!uploadResult) {
    // Update export status to failed
    await supabase
      .from('training_exports')
      .update({ status: 'upload_failed' })
      .eq('id', exportId);

    return NextResponse.json({ 
      error: 'Failed to upload training data to Together AI',
      export_id: exportId
    }, { status: 500 });
  }

  // Update export with file info
  await supabase
    .from('training_exports')
    .update({ 
      status: 'uploaded',
      // Store file_id in a metadata column or we can add it
    })
    .eq('id', exportId);

  // Step 6: Start fine-tuning job
  const trainResult = await tuner.train(
    uploadResult.fileId,
    userId,
    // Only continue from previous if it's a fine-tuned model (not the base reference model)
    baseModelId.includes('ghost-') ? baseModelId : undefined,
    {
      nEpochs,
      lora,
      loraR,
      loraAlpha,
      learningRate,
      batchSize
    }
  );

  if (!trainResult) {
    // Update export status to failed
    await supabase
      .from('training_exports')
      .update({ status: 'training_failed' })
      .eq('id', exportId);

    return NextResponse.json({ 
      error: 'Failed to start fine-tuning job on Together AI',
      export_id: exportId,
      file_id: uploadResult.fileId
    }, { status: 500 });
  }

  // Step 7: Update export with training job info
  await supabase
    .from('training_exports')
    .update({ 
      status: 'training',
      training_job_id: trainResult.jobId
    })
    .eq('id', exportId);

  return NextResponse.json({
    success: true,
    export_id: exportId,
    file_id: uploadResult.fileId,
    job_id: trainResult.jobId,
    job_status: trainResult.status,
    pairs_count: pairs.length,
    avg_quality: pairs.reduce((sum, p) => sum + p.quality_score, 0) / pairs.length,
    base_model: baseModelId,
    training_config: {
      epochs: nEpochs,
      lora,
      loraR,
      loraAlpha,
      learningRate,
      batchSize
    },
    message: `Training job started. Poll GET /api/training/job?jobId=${trainResult.jobId} to check status.`
  });
}

/**
 * PATCH /api/training
 * Update export status (after training job completes)
 * Body: { exportId, status, trainingJobId?, resultingModelId? }
 */
export async function PATCH(req: Request) {
  const { exportId, status, trainingJobId, resultingModelId } = await req.json();
  if (!exportId) return NextResponse.json({ error: 'exportId required' }, { status: 400 });

  const updates: Record<string, unknown> = { status };
  if (trainingJobId) updates.training_job_id = trainingJobId;
  if (resultingModelId) updates.resulting_model_id = resultingModelId;
  if (status === 'completed' || status === 'active') updates.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from('training_exports')
    .update(updates)
    .eq('id', exportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, export_id: exportId, status });
}
