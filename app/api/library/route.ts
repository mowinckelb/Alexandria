import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const userIds = new Set<string>();

    const { data: twins } = await supabase
      .from('twins')
      .select('user_id')
      .limit(200);
    for (const row of twins || []) {
      if (row.user_id) userIds.add(row.user_id);
    }

    const { data: entries } = await supabase
      .from('entries')
      .select('user_id')
      .order('created_at', { ascending: false })
      .limit(500);
    for (const row of entries || []) {
      if (row.user_id) userIds.add(row.user_id);
    }

    const personaIds = [...userIds].slice(0, 100);
    const { data: maturityRows, error: maturityError } = await supabase
      .from('plm_maturity')
      .select('user_id, overall_score')
      .in('user_id', personaIds);
    if (maturityError) {
      return NextResponse.json({ error: maturityError.message }, { status: 500 });
    }

    const { data: pendingReportsRows, error: pendingReportsError } = await supabase
      .from('persona_activity')
      .select('user_id, created_at')
      .eq('action_type', 'library_report_received')
      .eq('requires_attention', true)
      .in('user_id', personaIds);
    if (pendingReportsError) {
      return NextResponse.json({ error: pendingReportsError.message }, { status: 500 });
    }

    const since7dIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: growthRows, error: growthError } = await supabase
      .from('persona_activity')
      .select('user_id, action_type')
      .in('user_id', personaIds)
      .in('action_type', ['library_persona_view', 'library_persona_interaction', 'external_persona_query'])
      .gte('created_at', since7dIso)
      .limit(10000);
    if (growthError) {
      return NextResponse.json({ error: growthError.message }, { status: 500 });
    }

    const maturityByUser = new Map<string, number>();
    for (const row of maturityRows || []) maturityByUser.set(row.user_id, Number(row.overall_score || 0));
    const pendingByUser = new Map<string, number>();
    const oldestPendingHoursByUser = new Map<string, number>();
    for (const row of pendingReportsRows || []) {
      pendingByUser.set(row.user_id, (pendingByUser.get(row.user_id) || 0) + 1);
      const ageHours = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60));
      const currentMax = oldestPendingHoursByUser.get(row.user_id) || 0;
      oldestPendingHoursByUser.set(row.user_id, Math.max(currentMax, ageHours));
    }
    const growthByUser = new Map<string, { views7d: number; interactions7d: number; queries7d: number }>();
    for (const row of growthRows || []) {
      const current = growthByUser.get(row.user_id) || { views7d: 0, interactions7d: 0, queries7d: 0 };
      if (row.action_type === 'library_persona_view') current.views7d += 1;
      if (row.action_type === 'library_persona_interaction') current.interactions7d += 1;
      if (row.action_type === 'external_persona_query') current.queries7d += 1;
      growthByUser.set(row.user_id, current);
    }

    const personas: Array<{
      id: string;
      userId: string;
      title: string;
      subtitle: string;
      type: 'natural';
      readinessScore: number;
      trustBadges: string[];
      moderationPendingCount: number;
      moderationOldestPendingHours: number;
      rankingScore: number;
      growth: {
        views7d: number;
        interactions7d: number;
        externalQueries7d: number;
      };
    }> = await Promise.all(personaIds.map(async (id) => {
      const [trainingCount, constitutionRow] = await Promise.all([
        supabase.from('training_pairs').select('*', { count: 'exact', head: true }).eq('user_id', id),
        supabase.from('constitutions').select('id').eq('user_id', id).order('version', { ascending: false }).limit(1).maybeSingle()
      ]);

      const trainingPairs = trainingCount.count || 0;
      const hasConstitution = Boolean(constitutionRow.data?.id);
      const maturity = Number(maturityByUser.get(id) || 0);
      const pendingModeration = Number(pendingByUser.get(id) || 0);
      const growth = growthByUser.get(id) || { views7d: 0, interactions7d: 0, queries7d: 0 };
      const oldestPendingHours = Number((oldestPendingHoursByUser.get(id) || 0).toFixed(2));
      const hasRecentEntries = entries?.some((row) => row.user_id === id) || false;
      const hasTwin = twins?.some((row) => row.user_id === id) || false;

      const readinessScore = Math.max(0, Math.min(100, Math.round(
        (hasConstitution ? 25 : 0) +
        Math.min(30, Math.round((trainingPairs / 80) * 30)) +
        Math.min(30, Math.round(maturity * 30)) +
        (hasRecentEntries ? 10 : 0) +
        (hasTwin ? 5 : 0) -
        (pendingModeration > 0 ? 10 : 0)
      )));

      const trustBadges: string[] = [];
      if (hasConstitution) trustBadges.push('constitution-ready');
      if (trainingPairs >= 40) trustBadges.push('training-depth');
      if (maturity >= 0.6) trustBadges.push('mature-plm');
      if (hasRecentEntries) trustBadges.push('active-vault');
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

      return {
        id,
        userId: id,
        title: `Persona ${id.slice(0, 8)}`,
        subtitle: 'Natural persona',
        type: 'natural',
        readinessScore,
        trustBadges,
        moderationPendingCount: pendingModeration,
        moderationOldestPendingHours: oldestPendingHours,
        rankingScore,
        growth: {
          views7d: growth.views7d,
          interactions7d: growth.interactions7d,
          externalQueries7d: growth.queries7d
        }
      };
    }));
    personas.sort((a, b) => b.rankingScore - a.rankingScore);
    return NextResponse.json({ personas, count: personas.length, window: { since: since7dIso } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
