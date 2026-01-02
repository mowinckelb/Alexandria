// @CRITICAL: Feedback processing - Author trains PLM with good/bad ratings
// Routes learning to UnifiedEditor for notepad updates and training pairs
// Verify: feedback saved, Editor learns, training pairs created from good feedback

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getEditor } from '@/lib/factory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_KEY!
);

// Feedback schema - good/bad terminology
const feedbackSchema = z.object({
  userId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  rating: z.enum(['good', 'bad']),
  comment: z.string().optional(),
  prompt: z.string(),
  response: z.string(),
  modelId: z.string().optional(),
  isRegeneration: z.boolean().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = feedbackSchema.parse(body);
    
    // Convert good/bad to numeric for DB storage
    const numericFeedback = validated.rating === 'good' ? 1 : -1;

    // 1. Save to feedback_logs
    const { data, error } = await supabase
      .from('feedback_logs')
      .insert({
        user_id: validated.userId,
        message_id: validated.messageId,
        session_id: validated.sessionId,
        feedback: numericFeedback,
        comment: validated.comment,
        prompt: validated.prompt,
        response: validated.response,
        model_id: validated.modelId
      })
      .select('id')
      .single();

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    const feedbackId = data.id;
    const enhancements: string[] = [];

    // 2. Route learning to UnifiedEditor
    const editor = getEditor();
    await editor.learnFromFeedback({
      rating: validated.rating,
      comment: validated.comment,
      prompt: validated.prompt,
      response: validated.response
    }, validated.userId);
    
    enhancements.push('editor_learned');

    // 3. DPO Pair Detection - find opposing rating for same prompt
    if (validated.isRegeneration) {
      const { data: opposingFeedback } = await supabase
        .from('feedback_logs')
        .select('id, response, feedback')
        .eq('user_id', validated.userId)
        .eq('prompt', validated.prompt)
        .neq('id', feedbackId)
        .neq('feedback', numericFeedback)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (opposingFeedback) {
        const isCurrentChosen = numericFeedback > opposingFeedback.feedback;
        
        const { error: dpoError } = await supabase
          .from('preference_pairs')
          .insert({
            user_id: validated.userId,
            prompt: validated.prompt,
            chosen_response: isCurrentChosen ? validated.response : opposingFeedback.response,
            rejected_response: isCurrentChosen ? opposingFeedback.response : validated.response,
            chosen_feedback_id: isCurrentChosen ? feedbackId : opposingFeedback.id,
            rejected_feedback_id: isCurrentChosen ? opposingFeedback.id : feedbackId,
            margin: Math.abs(numericFeedback - opposingFeedback.feedback)
          });

        if (!dpoError) {
          enhancements.push('dpo_pair_created');
        }
      }
    }

    // 4. Reward Model Data - ALL feedback → normalized rewards
    const { error: rewardError } = await supabase
      .from('reward_training_data')
      .insert({
        user_id: validated.userId,
        prompt: validated.prompt,
        response: validated.response,
        reward: numericFeedback * 0.5,
        feedback_id: feedbackId
      });

    if (!rewardError) {
      enhancements.push('reward_data_added');
    }

    // 5. Direct observation for bad feedback
    if (validated.rating === 'bad') {
      await supabase.from('editor_notes').insert({
        user_id: validated.userId,
        type: 'observation',
        content: `PLM response was marked BAD for: "${validated.prompt.substring(0, 100)}..."`,
        context: validated.comment || 'No comment provided',
        topic: 'response_preferences',
        priority: validated.comment ? 'high' : 'low',
        category: 'non_critical'
      });
      enhancements.push('rejection_observation_added');
    }

    console.log(`[Feedback] Processed ${validated.rating} feedback: ${enhancements.join(', ')}`);

    return NextResponse.json({ 
      success: true, 
      feedbackId,
      rating: validated.rating,
      enhancements,
      message: 'Feedback recorded. Editor is learning from this.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid feedback data', details: error.issues }, { status: 400 });
    }
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for fetching feedback stats
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get feedback distribution
    const { data: distribution, error: distError } = await supabase
      .from('feedback_logs')
      .select('feedback')
      .eq('user_id', userId);

    if (distError) throw distError;

    // Calculate stats (binary: -1 bad, +1 good)
    const counts = { bad: 0, good: 0 };
    let total = 0;

    distribution?.forEach(row => {
      if (row.feedback === 1) counts.good++;
      else if (row.feedback === -1) counts.bad++;
      total++;
    });

    const positiveRate = total > 0 ? counts.good / total : 0;

    // Get count of preference pairs available for DPO
    const { count: pairCount } = await supabase
      .from('preference_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('export_id', null);

    // Get count of reward training data
    const { count: rewardCount } = await supabase
      .from('reward_training_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('export_id', null);

    // Get training readiness from Editor
    const editorInstance = getEditor();
    const trainingDecision = await editorInstance.assessTrainingReadiness(userId);

    return NextResponse.json({
      totalFeedback: total,
      distribution: counts,
      positiveRate: (positiveRate * 100).toFixed(0) + '%',
      preferencePairsAvailable: pairCount || 0,
      rewardDataAvailable: rewardCount || 0,
      dpoReady: (pairCount || 0) >= 100,
      rewardModelReady: (rewardCount || 0) >= 500,
      trainingRecommendation: trainingDecision
    });

  } catch (error) {
    console.error('Feedback stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
