import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getConstitutionManager } from '@/lib/factory';

// Canon grows through per-entry deltas in processEntry.
// This cron only derives Training/Inference views from the existing Canon.

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

async function getActiveUsers() {
  const supabase = getSupabase();
  const deduped = new Set<string>();

  const [twins, systemConfigs, editorState, entries] = await Promise.all([
    supabase.from('twins').select('user_id').limit(100),
    supabase.from('system_configs').select('user_id').order('updated_at', { ascending: false }).limit(100),
    supabase.from('editor_state').select('user_id').order('updated_at', { ascending: false }).limit(100),
    supabase.from('entries').select('user_id').order('created_at', { ascending: false }).limit(200)
  ]);

  for (const row of twins.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }
  for (const row of systemConfigs.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }
  for (const row of editorState.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }
  for (const row of entries.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }

  return [...deduped];
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scopedUserId = request.nextUrl.searchParams.get('userId');
    const userIds = scopedUserId ? [scopedUserId] : await getActiveUsers();
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, usersChecked: 0, results: [] });
    }

    const supabase = getSupabase();
    const manager = getConstitutionManager();
    const now = new Date();
    const results: Array<{ userId: string; action: string; details: Record<string, unknown> }> = [];

    for (const userId of userIds) {
      try {
        // Check if agents are paused
        const { data: sysConfig } = await supabase
          .from('system_configs')
          .select('config')
          .eq('user_id', userId)
          .maybeSingle();
        if ((sysConfig?.config as Record<string, unknown>)?.paused) {
          results.push({ userId, action: 'skipped', details: { reason: 'agents_paused' } });
          continue;
        }

        // Derive Training/Inference views from existing Canon Constitution.
        // The Canon grows through per-entry deltas — this cron only creates
        // the downstream optimized views, never overwrites the Canon.
        const deriveResult = await manager.deriveViews(userId);

        if (!deriveResult) {
          results.push({
            userId,
            action: 'skipped',
            details: { reason: 'no_constitution_exists' }
          });
          continue;
        }

        await supabase.from('persona_activity').insert({
          user_id: userId,
          action_type: 'constitution_views_derived',
          summary: `Derived Training + Inference views from Canon v${deriveResult.version}`,
          details: { version: deriveResult.version },
          requires_attention: false
        });
        results.push({
          userId,
          action: 'derived_views',
          details: { version: deriveResult.version }
        });
      } catch (error) {
        results.push({
          userId,
          action: 'constitution_failed',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      usersChecked: userIds.length,
      results
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
