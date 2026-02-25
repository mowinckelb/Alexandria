import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getConstitutionManager } from '@/lib/factory';

const MIN_PAIRS_FOR_INITIAL_EXTRACTION = 8;
const MIN_NEW_PAIRS_FOR_REFRESH = 10;
const MIN_QUALITY = 0.3;
const REFRESH_COOLDOWN_HOURS = 6;

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

        const current = await manager.getConstitution(userId);
        const { count: totalPairs } = await supabase
          .from('training_pairs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('quality_score', MIN_QUALITY);
        const pairCount = totalPairs || 0;

        if (!current) {
          if (pairCount < MIN_PAIRS_FOR_INITIAL_EXTRACTION) {
            results.push({
              userId,
              action: 'skipped',
              details: {
                reason: 'insufficient_pairs_initial',
                available: pairCount,
                required: MIN_PAIRS_FOR_INITIAL_EXTRACTION
              }
            });
            continue;
          }

          const extraction = await manager.extractConstitution(userId, {
            sourceData: 'both',
            includeEditorNotes: true
          });
          await supabase.from('persona_activity').insert({
            user_id: userId,
            action_type: 'constitution_auto_extracted',
            summary: `Auto-extracted constitution v${extraction.constitution.version}`,
            details: {
              coverage: extraction.coverage,
              sectionsExtracted: extraction.sectionsExtracted
            },
            requires_attention: false
          });
          results.push({
            userId,
            action: 'extracted',
            details: {
              version: extraction.constitution.version,
              coverage: extraction.coverage
            }
          });
          continue;
        }

        const currentCreatedAt = current.createdAt ? new Date(current.createdAt) : null;
        if (currentCreatedAt) {
          const hoursSince = (now.getTime() - currentCreatedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < REFRESH_COOLDOWN_HOURS) {
            results.push({
              userId,
              action: 'skipped',
              details: {
                reason: 'refresh_cooldown',
                hoursSinceLastConstitution: Math.round(hoursSince)
              }
            });
            continue;
          }
        }

        const { count: newPairsCount } = await supabase
          .from('training_pairs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('quality_score', MIN_QUALITY)
          .gt('created_at', current.createdAt);
        const newPairs = newPairsCount || 0;

        if (newPairs < MIN_NEW_PAIRS_FOR_REFRESH) {
          results.push({
            userId,
            action: 'skipped',
            details: {
              reason: 'insufficient_new_pairs',
              newPairs,
              required: MIN_NEW_PAIRS_FOR_REFRESH
            }
          });
          continue;
        }

        const extraction = await manager.extractConstitution(userId, {
          sourceData: 'both',
          includeEditorNotes: true
        });
        await supabase.from('persona_activity').insert({
          user_id: userId,
          action_type: 'constitution_auto_refreshed',
          summary: `Auto-refreshed constitution v${extraction.constitution.version}`,
          details: {
            coverage: extraction.coverage,
            newPairsSinceLast: newPairs
          },
          requires_attention: false
        });
        results.push({
          userId,
          action: 'refreshed',
          details: {
            version: extraction.constitution.version,
            coverage: extraction.coverage,
            newPairs
          }
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
