import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const [
      entriesCount,
      memoriesCount,
      trainingCount,
      constitutionRow
    ] = await Promise.all([
      supabase.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('memory_fragments').select('*', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('training_pairs').select('*', { count: 'exact', head: true }).eq('user_id', id),
      supabase
        .from('constitutions')
        .select('version, sections')
        .eq('user_id', id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    const activeCon = constitutionRow.data as { version?: number; sections?: Record<string, unknown> } | null;

    return NextResponse.json({
      id,
      title: `Persona ${id.slice(0, 8)}`,
      type: 'natural',
      summary: {
        counts: {
          entries: entriesCount.count || 0,
          memoryFragments: memoriesCount.count || 0,
          trainingPairs: trainingCount.count || 0
        },
        constitutionVersion: activeCon?.version ?? null,
        hasConstitution: Boolean(activeCon),
        hasWorldview: Boolean(activeCon?.sections && (activeCon.sections as Record<string, unknown>).worldview),
        hasValues: Boolean(activeCon?.sections && (activeCon.sections as Record<string, unknown>).values)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
