import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/debug/state?userId=xxx
 * Returns comprehensive system state for debugging/verification
 */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const now = new Date();

  // Parallel queries for all tables
  const [
    entriesResult,
    memoryResult,
    trainingPairsResult,
    feedbackResult,
    preferencePairsResult,
    rewardDataResult,
    activeModelResult,
    recentExportsResult,
    recentEntriesResult,
    recentFeedbackResult,
    // RLAIF stats
    syntheticRatingsResult,
    editorNotesResult,
    rlaifStatsResult
  ] = await Promise.all([
    // Counts
    supabase.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('memory_fragments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('training_pairs').select('id, quality_score, created_at', { count: 'exact' }).eq('user_id', userId),
    supabase.from('feedback_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('preference_pairs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('reward_training_data').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    
    // Active model
    supabase.rpc('get_active_model', { p_user_id: userId }),
    
    // Recent exports
    supabase.from('training_exports')
      .select('id, status, pair_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
    
    // Recent entries (last 5)
    supabase.from('entries')
      .select('id, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    
    // Recent feedback (last 5)
    supabase.from('feedback_logs')
      .select('id, feedback, comment, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    
    // RLAIF: Synthetic ratings
    supabase.from('synthetic_ratings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    
    // Editor notepad stats
    supabase.rpc('get_editor_notes_stats', { p_user_id: userId }),
    
    // RLAIF stats
    supabase.rpc('get_rlaif_stats', { p_user_id: userId })
  ]);

  // Calculate training pair stats
  const trainingPairs = trainingPairsResult.data || [];
  const avgQuality = trainingPairs.length > 0 
    ? trainingPairs.reduce((sum, p) => sum + (p.quality_score || 0), 0) / trainingPairs.length 
    : 0;
  const lastTrainingPair = trainingPairs.length > 0 
    ? trainingPairs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  // Helper to get time ago string
  const timeAgo = (date: string | null): string => {
    if (!date) return 'never';
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return NextResponse.json({
    timestamp: now.toISOString(),
    userId,
    
    // Core data counts
    counts: {
      entries: entriesResult.count || 0,
      memoryFragments: memoryResult.count || 0,
      trainingPairs: trainingPairsResult.count || 0,
      feedbackLogs: feedbackResult.count || 0,
      preferencePairs: preferencePairsResult.count || 0,
      rewardData: rewardDataResult.count || 0
    },
    
    // Training status
    training: {
      avgQuality: Math.round(avgQuality * 100) / 100,
      lastPairCreated: lastTrainingPair ? timeAgo(lastTrainingPair.created_at) : 'never',
      readyForTraining: (trainingPairsResult.count || 0) >= 100,
      recentExports: (recentExportsResult.data || []).map(e => ({
        id: e.id.slice(0, 8),
        status: e.status,
        pairs: e.pair_count,
        when: timeAgo(e.created_at)
      }))
    },
    
    // PLM model
    plm: {
      activeModel: activeModelResult.data || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      isFineTuned: !!(activeModelResult.data && !activeModelResult.data.includes('Meta-Llama'))
    },
    
    // RLHF pipeline
    rlhf: {
      feedbackCount: feedbackResult.count || 0,
      dpoReady: (preferencePairsResult.count || 0) >= 10,
      preferencePairs: preferencePairsResult.count || 0,
      rewardDataPoints: rewardDataResult.count || 0
    },
    
    // RLAIF synthetic feedback
    rlaif: (() => {
      const stats = rlaifStatsResult.data?.[0];
      const feedbackCount = feedbackResult.count || 0;
      const autoApproved = Number(stats?.auto_approved) || 0;
      return {
        syntheticRatings: syntheticRatingsResult.count || 0,
        autoApproved,
        queuedReview: Number(stats?.queued_review) || 0,
        authorValidated: Number(stats?.author_validated) || 0,
        agreementRate: stats?.author_agreement_rate || null,
        feedbackMultiplier: feedbackCount > 0 
          ? `${(autoApproved / feedbackCount).toFixed(1)}x` 
          : 'N/A',
        byConfidence: stats?.by_confidence || { high: 0, medium: 0, low: 0 }
      };
    })(),
    
    // Editor notepad
    editor: (() => {
      const stats = editorNotesResult.data?.[0];
      return {
        totalNotes: Number(stats?.total_notes) || 0,
        pendingQuestions: Number(stats?.pending_questions) || 0,
        pendingGaps: Number(stats?.pending_gaps) || 0,
        observations: Number(stats?.observations) || 0,
        mentalModels: Number(stats?.mental_models) || 0,
        criticalPending: Number(stats?.critical_pending) || 0
      };
    })(),
    
    // Recent activity (for verification)
    recent: {
      entries: (recentEntriesResult.data || []).map(e => ({
        id: e.id.slice(0, 8),
        preview: e.content.slice(0, 50) + (e.content.length > 50 ? '...' : ''),
        when: timeAgo(e.created_at)
      })),
      feedback: (recentFeedbackResult.data || []).map(f => ({
        id: f.id.slice(0, 8),
        rating: f.feedback > 0 ? '+1' : '-1',
        comment: f.comment ? f.comment.slice(0, 30) : null,
        when: timeAgo(f.created_at)
      }))
    }
  });
}
