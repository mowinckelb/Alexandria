import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildMergedSystemConfig, validateSystemConfigAxioms } from '@/lib/system/axioms';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const now = new Date();

    const [
      editorStateRes,
      pendingQueueRes,
      runningQueueRes,
      pendingReviewsRes,
      undeliveredMessagesRes,
      pendingTrainPairsRes,
      lastTrainRes,
      queuedBlueprintProposalsRes,
      highImpactBlueprintRes,
      systemConfigRes,
      twinRes,
      activeModelRes
    ] = await Promise.all([
      supabase
        .from('editor_state')
        .select('last_cycle_at,next_cycle_at,activity_level,cycle_count,sleep_duration_minutes')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('processing_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('processing_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['processing', 'running']),
      supabase
        .from('rlaif_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('routing', 'author_review')
        .is('author_verdict', null),
      supabase
        .from('editor_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('delivered', false),
      supabase
        .from('training_pairs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('used_for_export', false)
        .gte('quality_score', 0.4),
      supabase
        .from('training_exports')
        .select('id,status,created_at,completed_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('blueprint_proposals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['queued', 'reviewing']),
      supabase
        .from('blueprint_proposals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('impact_level', 'high')
        .in('status', ['queued', 'reviewing']),
      supabase
        .from('system_configs')
        .select('config')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('twins')
        .select('status,model_id,last_trained_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .rpc('get_active_model', { p_user_id: userId })
    ]);

    const pendingQueue = pendingQueueRes.count || 0;
    const runningQueue = runningQueueRes.count || 0;
    const queueHealthy = runningQueue > 0 || pendingQueue === 0;
    const lastCycleAtRaw = editorStateRes.data?.last_cycle_at || null;
    const nextCycleAtRaw = editorStateRes.data?.next_cycle_at || null;
    const sleepMinutes = editorStateRes.data?.sleep_duration_minutes || 10;
    const lastCycleMs = lastCycleAtRaw ? new Date(lastCycleAtRaw).getTime() : null;
    const nextCycleMs = nextCycleAtRaw ? new Date(nextCycleAtRaw).getTime() : null;
    const staleCutoffMs = Math.max(60, sleepMinutes * 3) * 60 * 1000;
    const editorStale = lastCycleMs ? (now.getTime() - lastCycleMs > staleCutoffMs) : false;
    const editorHealthy = Boolean(nextCycleAtRaw) && !editorStale;
    const readyPairs = pendingTrainPairsRes.count || 0;
    const mergedConfig = buildMergedSystemConfig((systemConfigRes.data?.config as Record<string, unknown> | undefined) || {});
    const axiomResult = validateSystemConfigAxioms(mergedConfig);

    const queuedHighImpact = highImpactBlueprintRes.count || 0;
    const nextActions: string[] = [];
    if (!axiomResult.valid) {
      nextActions.push('Fix axiom violations in system config before further iteration.');
    }
    if (editorStale) {
      nextActions.push('Run /api/cron/editor-cycle to refresh editor scheduling.');
    }
    if (readyPairs < 50) {
      nextActions.push(`Ingest more data to reach 50 quality pairs (currently ${readyPairs}).`);
    } else if (!lastTrainRes.data) {
      nextActions.push('Trigger training to activate the first fine-tuned model.');
    }
    if ((pendingReviewsRes.count || 0) > 0) {
      nextActions.push(`Review pending RLAIF items (${pendingReviewsRes.count}).`);
    }
    if (queuedHighImpact > 0) {
      nextActions.push(`Resolve high-impact blueprint proposals (${queuedHighImpact}).`);
    }

    const coreHealthy = editorHealthy && queueHealthy && axiomResult.valid;
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      userId,
      machine: {
        healthy: coreHealthy,
        coreHealthy,
        warnings: {
          queuedHighImpactBlueprintProposals: queuedHighImpact
        },
        axioms: {
          healthy: axiomResult.valid,
          violations: axiomResult.violations
        },
        editorLoop: {
          healthy: editorHealthy,
          activityLevel: editorStateRes.data?.activity_level || 'unknown',
          cycleCount: editorStateRes.data?.cycle_count || 0,
          sleepMinutes: editorStateRes.data?.sleep_duration_minutes || null,
          lastCycleAt: lastCycleAtRaw,
          nextCycleAt: nextCycleAtRaw,
          stale: editorStale,
          lagMinutes: lastCycleMs ? Math.round((now.getTime() - lastCycleMs) / 60000) : null,
          nextInMinutes: nextCycleMs ? Math.max(0, Math.round((nextCycleMs - now.getTime()) / 60000)) : null
        },
        ingestionLoop: {
          healthy: queueHealthy,
          pendingJobs: pendingQueue,
          runningJobs: runningQueue
        },
        rlaifLoop: {
          pendingAuthorReview: pendingReviewsRes.count || 0,
          undeliveredEditorMessages: undeliveredMessagesRes.count || 0
        },
        trainingLoop: {
          readyPairs,
          readyForAutoTrain: readyPairs >= 50,
          twinStatus: twinRes.data?.status || (activeModelRes.data ? 'active' : 'unknown'),
          activeModelId: twinRes.data?.model_id || activeModelRes.data || null,
          lastTrainedAt: twinRes.data?.last_trained_at || null,
          lastTrainingExport: lastTrainRes.data
            ? {
                id: lastTrainRes.data.id,
                status: lastTrainRes.data.status,
                createdAt: lastTrainRes.data.created_at,
                completedAt: lastTrainRes.data.completed_at
              }
            : null
        },
        blueprintLoop: {
          queuedProposals: queuedBlueprintProposalsRes.count || 0,
          queuedHighImpact
        },
        nextActions
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
