import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getModelConfig } from '@/lib/models';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const [totalResult, processedResult, editorState, recentActivity] = await Promise.all([
      supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),

      supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('metadata->>editor_processed', 'true'),

      supabase
        .from('editor_state')
        .select('last_cycle_at, cycle_count, activity_level, metadata')
        .eq('user_id', userId)
        .single(),

      supabase
        .from('persona_activity')
        .select('summary, created_at, details, action_type')
        .eq('user_id', userId)
        .in('action_type', ['editor_entry_processed', 'editor_entry_failed'])
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const total = totalResult.count || 0;
    const processed = processedResult.count || 0;
    const remaining = total - processed;

    const models = getModelConfig();
    const lastCycle = editorState.data?.last_cycle_at || null;
    const cycleCount = editorState.data?.cycle_count || 0;

    const recentLogs = (recentActivity.data || []).map(a => ({
      time: a.created_at,
      summary: a.summary,
      memoriesStored: (a.details as Record<string, unknown>)?.entryResult
        ? ((a.details as Record<string, unknown>).entryResult as Record<string, number>)?.memoriesStored
        : undefined,
      trainingPairs: (a.details as Record<string, unknown>)?.entryResult
        ? ((a.details as Record<string, unknown>).entryResult as Record<string, number>)?.trainingPairsCreated
        : undefined,
    }));

    return NextResponse.json({
      total,
      processed,
      remaining,
      percentComplete: total > 0 ? Math.round((processed / total) * 100) : 0,
      model: {
        provider: models.provider,
        quality: models.quality,
        fast: models.fast,
      },
      editor: {
        lastCycleAt: lastCycle,
        cycleCount,
        activityLevel: editorState.data?.activity_level || 'unknown',
      },
      recentLogs,
    });
  } catch (error) {
    console.error('[Editor Status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
