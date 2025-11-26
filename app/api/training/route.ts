import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    .select('id, status, pair_count, created_at, resulting_model_id')
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
 * Export JSONL and create export batch record
 * Body: { userId, minQuality?, createExport? }
 */
export async function POST(req: Request) {
  const { userId, minQuality = 0.4, createExport = false } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

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
