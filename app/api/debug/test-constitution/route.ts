import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getConstitutionManager } from '@/lib/factory';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/debug/test-constitution?userId=xxx
 *   → Returns diagnostic info (fast)
 * GET /api/debug/test-constitution?userId=xxx&extract=true
 *   → Also runs full extraction (slow, ~60s)
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const doExtract = request.nextUrl.searchParams.get('extract') === 'true';
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const steps: Array<{ step: string; status: string; detail?: unknown }> = [];

  try {
    const { count: totalEntries } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    steps.push({ step: 'total_entries', status: 'ok', detail: totalEntries });

    const { count: processedEntries } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('metadata->>editor_processed', 'true');
    steps.push({ step: 'processed_entries', status: 'ok', detail: processedEntries });

    const { count: unprocessed } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or('metadata->>editor_processed.is.null,metadata->>editor_processed.eq.false');
    steps.push({ step: 'unprocessed_entries', status: 'ok', detail: unprocessed });

    const { count: pairCount } = await supabase
      .from('training_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    steps.push({ step: 'training_pairs', status: 'ok', detail: pairCount });

    const { count: noteCount } = await supabase
      .from('editor_notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    steps.push({ step: 'editor_notes', status: 'ok', detail: noteCount });

    const manager = getConstitutionManager();
    const existing = await manager.getConstitution(userId);
    steps.push({
      step: 'existing_constitution',
      status: 'ok',
      detail: existing
        ? { version: existing.version, id: existing.id, contentLength: existing.content.length, createdAt: existing.createdAt }
        : null
    });

    const { data: nextVersion, error: rpcError } = await supabase.rpc('get_next_constitution_version', { p_user_id: userId });
    steps.push({ step: 'rpc_next_version', status: rpcError ? 'ERROR' : 'ok', detail: rpcError ? rpcError.message : nextVersion });

    // Check recent persona_activity for editor errors
    const { data: recentActivity } = await supabase
      .from('persona_activity')
      .select('action_type, summary, created_at')
      .eq('user_id', userId)
      .in('action_type', ['editor_entry_processed', 'editor_entry_failed'])
      .order('created_at', { ascending: false })
      .limit(5);
    steps.push({ step: 'recent_editor_activity', status: 'ok', detail: recentActivity });

    // Check agentsPaused
    const { data: configData } = await supabase
      .from('system_configs')
      .select('config')
      .eq('user_id', userId)
      .maybeSingle();
    const agentsPaused = (configData?.config as Record<string, unknown>)?.agentsPaused;
    steps.push({ step: 'agents_paused', status: 'ok', detail: agentsPaused ?? false });

    if (!doExtract) {
      return NextResponse.json({
        success: true,
        message: 'Diagnostics only. Add &extract=true to also run extraction.',
        steps
      });
    }

    // Full extraction
    steps.push({ step: 'extraction', status: 'starting...' });
    const result = await manager.extractConstitution(userId, {
      sourceData: 'both',
      includeEditorNotes: true,
    });
    steps.push({
      step: 'extraction_complete',
      status: 'ok',
      detail: {
        version: result.constitution.version,
        coverage: `${(result.coverage * 100).toFixed(1)}%`,
        sectionsExtracted: result.sectionsExtracted,
        sectionsMissing: result.sectionsMissing,
        contentPreview: result.constitution.content.slice(0, 500),
      }
    });

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    steps.push({
      step: 'FATAL_ERROR',
      status: 'failed',
      detail: err instanceof Error ? { message: err.message, stack: err.stack?.split('\n').slice(0, 8) } : String(err)
    });
    return NextResponse.json({ success: false, steps }, { status: 500 });
  }
}
