import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

const MIN_PAIRS_FOR_TRAINING = 50;
const MIN_QUALITY = 0.4;
const COOLDOWN_HOURS = 24;

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
    const { data: users } = await supabase
      .from('twins')
      .select('user_id')
      .limit(50);

    const userIds = (users || []).map(u => u.user_id).filter(Boolean);
    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users found', results: [] });
    }

    for (const userId of userIds) {
      const { data: recentTraining } = await supabase
        .from('training_exports')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .in('status', ['uploading', 'uploaded', 'training'])
        .limit(1);

      if (recentTraining && recentTraining.length > 0) {
        results.push({
          userId,
          action: 'skipped',
          details: { reason: 'training_in_progress', jobId: recentTraining[0].id }
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
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
