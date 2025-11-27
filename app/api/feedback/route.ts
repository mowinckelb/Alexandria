import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getDecisionEditor, SUGGESTED_DEFAULTS } from '@/lib/modules/core/decision-editor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_KEY!
);

const decisionEditor = getDecisionEditor();

const feedbackSchema = z.object({
  userId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  feedback: z.number().int().refine(val => val === -1 || val === 1, {
    message: 'Feedback must be binary: -1 (bad) or +1 (good)'
  }),
  comment: z.string().optional(),
  prompt: z.string(),
  response: z.string(),
  modelId: z.string().optional(),
  isRegeneration: z.boolean().optional()  // True if this is A/B comparison
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = feedbackSchema.parse(body);

    // 1. Save to feedback_logs
    const { data, error } = await supabase
      .from('feedback_logs')
      .insert({
        user_id: validated.userId,
        message_id: validated.messageId,
        session_id: validated.sessionId,
        feedback: validated.feedback,
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

    // 2. AUTO: LoRA Enhancement - positive feedback → training_pairs
    // Works for BOTH initial responses AND regenerations
    if (validated.feedback === 1) {
      // Get existing pair count for context
      const { count: existingPairs } = await supabase
        .from('training_pairs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', validated.userId);

      // Decision Editor determines quality score (suggested defaults provided as context)
      const qualityScore = await decisionEditor.decideQualityScore({
        isRegeneration: validated.isRegeneration || false,
        feedbackValue: validated.feedback,
        existingPairs: existingPairs || 0
      });
      
      const { error: loraError } = await supabase
        .from('training_pairs')
        .insert({
          user_id: validated.userId,
          system_prompt: 'You are a digital ghost.',
          user_content: validated.prompt,
          assistant_content: validated.response,
          quality_score: qualityScore
        });
      
      if (!loraError) {
        enhancements.push(validated.isRegeneration ? 'lora_pair_added_ab_confirmed' : 'lora_pair_added');
      }
    }

    // 3. AUTO: DPO Pair Detection - find opposing rating for same prompt
    if (validated.isRegeneration) {
      // Look for a different rating on the same prompt in this session
      const { data: opposingFeedback } = await supabase
        .from('feedback_logs')
        .select('id, response, feedback')
        .eq('user_id', validated.userId)
        .eq('prompt', validated.prompt)
        .neq('id', feedbackId)
        .neq('feedback', validated.feedback)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (opposingFeedback) {
        // We have an A/B pair! Determine chosen vs rejected
        const isCurrentChosen = validated.feedback > opposingFeedback.feedback;
        
        const { error: dpoError } = await supabase
          .from('preference_pairs')
          .insert({
            user_id: validated.userId,
            prompt: validated.prompt,
            chosen_response: isCurrentChosen ? validated.response : opposingFeedback.response,
            rejected_response: isCurrentChosen ? opposingFeedback.response : validated.response,
            chosen_feedback_id: isCurrentChosen ? feedbackId : opposingFeedback.id,
            rejected_feedback_id: isCurrentChosen ? opposingFeedback.id : feedbackId,
            margin: Math.abs(validated.feedback - opposingFeedback.feedback)
          });

        if (!dpoError) {
          enhancements.push('dpo_pair_created');
        }
      }
    }

    // 4. AUTO: Reward Model Data - ALL feedback (initial + regenerations) → normalized rewards
    const { error: rewardError } = await supabase
      .from('reward_training_data')
      .insert({
        user_id: validated.userId,
        prompt: validated.prompt,
        response: validated.response,
        reward: validated.feedback * 0.5,  // Binary: -1→-0.5, +1→+0.5
        feedback_id: feedbackId
      });

    if (!rewardError) {
      enhancements.push(validated.isRegeneration ? 'reward_data_added_ab' : 'reward_data_added');
    }

    return NextResponse.json({ 
      success: true, 
      feedbackId,
      enhancements,
      message: 'Feedback recorded and processed.'
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

    return NextResponse.json({
      totalFeedback: total,
      distribution: counts,
      positiveRate: (positiveRate * 100).toFixed(0) + '%',
      preferencePairsAvailable: pairCount || 0,
      rewardDataAvailable: rewardCount || 0,
      dpoReady: (pairCount || 0) >= 100,  // Need ~100+ preference pairs for DPO
      rewardModelReady: (rewardCount || 0) >= 500  // Need more data for reward model
    });

  } catch (error) {
    console.error('Feedback stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

