import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_KEY!
);

const feedbackSchema = z.object({
  userId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  feedback: z.number().int().min(-2).max(2),
  comment: z.string().optional(),
  prompt: z.string(),      // The user's query
  response: z.string(),    // The assistant's response
  modelId: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = feedbackSchema.parse(body);

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

    return NextResponse.json({ 
      success: true, 
      feedbackId: data.id,
      message: 'Feedback recorded. Thank you for helping improve Ghost.'
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

    // Calculate stats
    const counts = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
    let total = 0;
    let sum = 0;

    distribution?.forEach(row => {
      counts[row.feedback.toString() as keyof typeof counts]++;
      total++;
      sum += row.feedback;
    });

    const avgRating = total > 0 ? sum / total : 0;

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
      averageRating: avgRating.toFixed(2),
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

