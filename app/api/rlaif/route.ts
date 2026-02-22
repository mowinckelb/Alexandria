// RLAIF: Synthetic Feedback Multiplier
// Generates synthetic good/bad ratings to multiply Author's training data

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEditor } from '@/lib/factory';
import { ConstitutionManager } from '@/lib/modules/constitution/manager';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

const actionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['generate', 'stats', 'validate', 'pending', 'gaps']),
  // For generate action
  maxPrompts: z.number().optional(),
  // For validate action
  ratingId: z.string().uuid().optional(),
  agreed: z.boolean().optional(),
  comment: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = actionSchema.parse(body);
    const editor = getEditor();
    const constitutionManager = new ConstitutionManager();

    switch (validated.action) {
      case 'generate': {
        // Generate synthetic feedback
        const result = await editor.generateSyntheticFeedback(
          validated.userId,
          { maxPrompts: validated.maxPrompts || 5 }
        );
        const gaps = await constitutionManager.getGapSummary(validated.userId);
        
        return NextResponse.json({
          success: true,
          ...result,
          topGap: gaps[0]?.section || null,
          message: `Generated ${result.generated} synthetic evaluations. ${result.autoApproved} auto-approved, ${result.queuedForReview} queued for your review.`
        });
      }
      
      case 'stats': {
        // Get RLAIF statistics
        const stats = await editor.getRLAIFStats(validated.userId);
        const supabase = getSupabase();
        const { data: maturity } = await supabase
          .from('plm_maturity')
          .select('overall_score, domain_scores, updated_at')
          .eq('user_id', validated.userId)
          .maybeSingle();
        
        return NextResponse.json({
          success: true,
          stats,
          maturity: maturity ? {
            overallScore: maturity.overall_score,
            domainScores: maturity.domain_scores || {},
            updatedAt: maturity.updated_at
          } : null,
          message: stats.totalSynthetic > 0 
            ? `${stats.totalSynthetic} synthetic ratings generated. ${stats.agreementRate !== null ? `${stats.agreementRate}% agreement rate.` : ''}`
            : 'No synthetic ratings yet. Run "generate" to create some.'
        });
      }
      
      case 'validate': {
        // Author validates a synthetic rating
        if (!validated.ratingId || validated.agreed === undefined) {
          return NextResponse.json(
            { error: 'ratingId and agreed are required for validate action' },
            { status: 400 }
          );
        }
        
        await editor.validateSyntheticRating(
          validated.ratingId,
          validated.userId,
          validated.agreed,
          validated.comment
        );
        
        return NextResponse.json({
          success: true,
          message: validated.agreed 
            ? 'Thanks! Your validation helps improve future synthetic ratings.'
            : 'Got it. I\'ll learn from this disagreement.'
        });
      }
      
      case 'pending': {
        // Get pending reviews (items in notepad)
        // This is handled through the normal notepad flow, but we can show stats
        const stats = await editor.getRLAIFStats(validated.userId);
        
        return NextResponse.json({
          success: true,
          pendingReviews: stats.queuedReview,
          message: stats.queuedReview > 0 
            ? `You have ${stats.queuedReview} synthetic ratings to review. They'll appear as questions in your next conversation.`
            : 'No pending reviews.'
        });
      }

      case 'gaps': {
        const gaps = await constitutionManager.getGapSummary(validated.userId, { recompute: true });
        return NextResponse.json({
          success: true,
          gaps,
          message: gaps.length > 0
            ? `Top gap: ${gaps[0].section} (${gaps[0].priority})`
            : 'No constitution gaps recorded yet.'
        });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }
    console.error('RLAIF error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const editor = getEditor();
    const constitutionManager = new ConstitutionManager();
    const stats = await editor.getRLAIFStats(userId);
    const gaps = await constitutionManager.getGapSummary(userId);
    
    // Get training stats for context
    const trainingDecision = await editor.assessTrainingReadiness(userId);

    return NextResponse.json({
      rlaif: stats,
      constitutionGaps: gaps,
      training: trainingDecision.stats,
      trainingRecommendation: trainingDecision,
      feedbackMultiplier: stats.totalSynthetic > 0 && trainingDecision.stats.feedbackCount > 0
        ? (stats.autoApproved / trainingDecision.stats.feedbackCount).toFixed(1) + 'x'
        : 'N/A',
      message: stats.totalSynthetic > 0
        ? `RLAIF has generated ${stats.autoApproved} training pairs from ${trainingDecision.stats.feedbackCount} Author feedbacks (${((stats.autoApproved / Math.max(trainingDecision.stats.feedbackCount, 1)) * 100).toFixed(0)}% multiplier)`
        : 'Run POST /api/rlaif with action: "generate" to start synthetic feedback generation.'
    });

  } catch (error) {
    console.error('RLAIF stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

