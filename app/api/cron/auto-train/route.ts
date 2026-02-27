import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTrainingTools } from '@/lib/factory';

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

const MIN_PAIRS_FOR_TRAINING = 15;
const MIN_QUALITY = 0.3;
const COOLDOWN_HOURS = 6;

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

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const results: Array<{
    userId: string;
    action: string;
    details: Record<string, unknown>;
  }> = [];

  try {
    const targetUserId = request.nextUrl.searchParams.get('userId');
    const userIds = targetUserId ? [targetUserId] : await getActiveUsers();
    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users found', results: [] });
    }

    const { tuner } = getTrainingTools();

    for (const userId of userIds) {
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

      // Phase 1: Check in-progress jobs — auto-activate completed, clean up failed
      const { data: inProgressExports } = await supabase
        .from('training_exports')
        .select('id, user_id, training_job_id, status')
        .eq('user_id', userId)
        .in('status', ['uploading', 'uploaded', 'training']);

      let jobStillRunning = false;
      for (const exp of inProgressExports || []) {
        if (!exp.training_job_id) continue;
        const jobStatus = await tuner.getJobStatus(exp.training_job_id);
        if (!jobStatus) continue;

        if (jobStatus.status === 'completed' && jobStatus.fine_tuned_model) {
          // Deploy LoRA model on Fireworks serverless before activating
          const deployed = await tuner.deployModel(jobStatus.fine_tuned_model);
          if (!deployed) {
            console.warn(`[AutoTrain] Deploy failed for ${jobStatus.fine_tuned_model}, will retry next cycle`);
            jobStillRunning = true;
            continue;
          }

          // Auto-activate: update export + twins
          await supabase.from('training_exports').update({
            status: 'active',
            resulting_model_id: jobStatus.fine_tuned_model,
            completed_at: new Date().toISOString()
          }).eq('id', exp.id);

          const { data: existingTwin } = await supabase
            .from('twins').select('id').eq('user_id', userId).single();
          if (existingTwin) {
            await supabase.from('twins').update({
              model_id: jobStatus.fine_tuned_model,
              status: 'active',
              training_job_id: exp.id,
              updated_at: new Date().toISOString()
            }).eq('user_id', userId);
          } else {
            await supabase.from('twins').insert({
              user_id: userId,
              model_id: jobStatus.fine_tuned_model,
              status: 'active',
              training_job_id: exp.id
            });
          }

          await supabase.from('persona_activity').insert({
            user_id: userId,
            action_type: 'plm_auto_activated',
            summary: `New PLM activated: ${jobStatus.fine_tuned_model}`,
            details: { exportId: exp.id, jobId: exp.training_job_id, model: jobStatus.fine_tuned_model, provider: 'fireworks' },
            requires_attention: false
          });

          results.push({
            userId,
            action: 'model_activated',
            details: { exportId: exp.id, model: jobStatus.fine_tuned_model }
          });
        } else if (jobStatus.status === 'failed' || jobStatus.status === 'cancelled') {
          await supabase.from('training_exports').update({ status: jobStatus.status }).eq('id', exp.id);
          // Free the pairs
          await supabase.from('training_pairs').update({ export_id: null }).eq('export_id', exp.id);
          results.push({
            userId,
            action: 'job_cleaned_up',
            details: { exportId: exp.id, jobStatus: jobStatus.status }
          });
        } else {
          jobStillRunning = true;
        }
      }

      if (jobStillRunning) {
        results.push({
          userId,
          action: 'skipped',
          details: { reason: 'training_in_progress' }
        });
        continue;
      }

      const { data: lastCompleted } = await supabase
        .from('training_exports')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (lastCompleted && lastCompleted.length > 0 && lastCompleted[0].completed_at) {
        const hoursSince = (Date.now() - new Date(lastCompleted[0].completed_at).getTime()) / (1000 * 60 * 60);
        if (hoursSince < COOLDOWN_HOURS) {
          results.push({
            userId,
            action: 'skipped',
            details: { reason: 'cooldown', hoursSinceLastTraining: Math.round(hoursSince) }
          });
          continue;
        }
      }

      const { count: availablePairs } = await supabase
        .from('training_pairs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('export_id', null)
        .gte('quality_score', MIN_QUALITY);

      const pairCount = availablePairs || 0;

      if (pairCount < MIN_PAIRS_FOR_TRAINING) {
        results.push({
          userId,
          action: 'skipped',
          details: { reason: 'insufficient_pairs', available: pairCount, required: MIN_PAIRS_FOR_TRAINING }
        });
        continue;
      }

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const vercelUrl = process.env.VERCEL_URL;
        const baseUrl = appUrl
          ? appUrl
          : vercelUrl
            ? `https://${vercelUrl}`
            : 'http://localhost:3000';

        const trainResponse = await fetch(`${baseUrl}/api/training`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'start',
            minQuality: MIN_QUALITY
          })
        });

        const trainResult = await trainResponse.json();

        if (trainResponse.ok && trainResult.success) {
          await supabase.from('persona_activity').insert({
            user_id: userId,
            action_type: 'auto_training_triggered',
            summary: `Auto-training started with ${pairCount} pairs`,
            details: {
              exportId: trainResult.export_id,
              jobId: trainResult.job_id,
              pairsCount: trainResult.pairs_count,
              avgQuality: trainResult.avg_quality
            },
            requires_attention: false
          });

          results.push({
            userId,
            action: 'training_started',
            details: {
              exportId: trainResult.export_id,
              jobId: trainResult.job_id,
              pairsCount: trainResult.pairs_count
            }
          });
        } else {
          results.push({
            userId,
            action: 'training_failed',
            details: { error: trainResult.error || 'Unknown error' }
          });
        }
      } catch (err) {
        results.push({
          userId,
          action: 'training_error',
          details: { error: err instanceof Error ? err.message : 'Unknown error' }
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
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
