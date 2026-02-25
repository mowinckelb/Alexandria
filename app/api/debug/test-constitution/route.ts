import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getConstitutionManager } from '@/lib/factory';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const steps: Array<{ step: string; status: string; detail?: unknown }> = [];

  try {
    // Step 1: Check entries
    const { count: totalEntries } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    steps.push({ step: 'entries_count', status: 'ok', detail: totalEntries });

    const { count: processedEntries } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('metadata->>editor_processed', 'true');
    steps.push({ step: 'processed_entries', status: 'ok', detail: processedEntries });

    // Step 2: Check training pairs
    const { count: pairCount } = await supabase
      .from('training_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    steps.push({ step: 'training_pairs', status: 'ok', detail: pairCount });

    // Step 3: Check editor notes
    const { count: noteCount } = await supabase
      .from('editor_notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    steps.push({ step: 'editor_notes', status: 'ok', detail: noteCount });

    // Step 4: Check existing constitution
    const manager = getConstitutionManager();
    const existing = await manager.getConstitution(userId);
    steps.push({ step: 'existing_constitution', status: 'ok', detail: existing ? { version: existing.version, id: existing.id } : null });

    // Step 5: Test RPC
    const { data: nextVersion, error: rpcError } = await supabase.rpc('get_next_constitution_version', { p_user_id: userId });
    steps.push({ step: 'rpc_next_version', status: rpcError ? 'error' : 'ok', detail: rpcError ? rpcError.message : nextVersion });

    // Step 6: Try full extraction
    steps.push({ step: 'extraction_starting', status: 'running' });
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
        contentLength: result.constitution.content.length,
      }
    });

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    steps.push({
      step: 'error',
      status: 'failed',
      detail: err instanceof Error ? { message: err.message, stack: err.stack?.split('\n').slice(0, 5) } : String(err)
    });
    return NextResponse.json({ success: false, steps }, { status: 500 });
  }
}
