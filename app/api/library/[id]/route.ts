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
      constitutionRow,
      maturityRow,
      pendingReportsRows,
      growthRows
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
        .maybeSingle(),
      supabase
        .from('plm_maturity')
        .select('overall_score, updated_at')
        .eq('user_id', id)
        .maybeSingle(),
      supabase
        .from('persona_activity')
        .select('created_at')
        .eq('user_id', id)
        .eq('action_type', 'library_report_received')
        .eq('requires_attention', true),
      supabase
        .from('persona_activity')
        .select('action_type')
        .eq('user_id', id)
        .in('action_type', ['library_persona_view', 'library_persona_interaction', 'external_persona_query'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5000)
    ]);

    const activeCon = constitutionRow.data as { version?: number; sections?: Record<string, unknown> } | null;
    const maturity = Number(maturityRow.data?.overall_score || 0);
    const pendingModeration = (pendingReportsRows.data || []).length;
    const oldestPendingHours = (pendingReportsRows.data || []).reduce((max, row) => {
      const ageHours = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60));
      return Math.max(max, ageHours);
    }, 0);
    const trainingPairs = trainingCount.count || 0;
    const entries = entriesCount.count || 0;
    const growth = { views7d: 0, interactions7d: 0, queries7d: 0 };
    for (const row of growthRows.data || []) {
      if (row.action_type === 'library_persona_view') growth.views7d += 1;
      if (row.action_type === 'library_persona_interaction') growth.interactions7d += 1;
      if (row.action_type === 'external_persona_query') growth.queries7d += 1;
    }
    const readinessScore = Math.max(0, Math.min(100, Math.round(
      (activeCon ? 30 : 0) +
      Math.min(30, Math.round((trainingPairs / 100) * 30)) +
      Math.min(30, Math.round(maturity * 30)) +
      Math.min(10, Math.round((entries / 40) * 10)) -
      (pendingModeration > 0 ? 10 : 0)
    )));
    const trustBadges: string[] = [];
    if (activeCon) trustBadges.push('constitution-ready');
    if (trainingPairs >= 40) trustBadges.push('training-depth');
    if (maturity >= 0.6) trustBadges.push('mature-plm');
    if (entries >= 20) trustBadges.push('active-vault');
    if (growth.interactions7d >= 3 || growth.queries7d >= 3) trustBadges.push('active-engagement');
    if (oldestPendingHours >= 72) trustBadges.push('moderation-overdue');
    trustBadges.push(pendingModeration > 0 ? 'moderation-pending' : 'moderation-clear');
    const rankingScore = Number((
      readinessScore * 0.65 +
      Math.min(20, growth.views7d) * 0.5 +
      Math.min(10, growth.interactions7d) * 1.5 +
      Math.min(10, growth.queries7d) * 2 -
      (pendingModeration > 0 ? 5 : 0)
    ).toFixed(2));

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
        hasValues: Boolean(activeCon?.sections && (activeCon.sections as Record<string, unknown>).values),
        readinessScore,
        trustBadges,
        maturityScore: Number(maturity.toFixed(4)),
        maturityUpdatedAt: maturityRow.data?.updated_at || null,
        moderationPendingCount: pendingModeration,
        moderationOldestPendingHours: Number(oldestPendingHours.toFixed(2)),
        rankingScore,
        growth: {
          views7d: growth.views7d,
          interactions7d: growth.interactions7d,
          externalQueries7d: growth.queries7d
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
