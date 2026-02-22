import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recomputePlmMaturity } from '@/lib/modules/core/plm-maturity';
import { createClient } from '@supabase/supabase-js';

const BodySchema = z.object({
  userId: z.string().uuid()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const result = await recomputePlmMaturity(parsed.data.userId);

    const supabase = getSupabase();
    await supabase.from('persona_activity').insert({
      user_id: parsed.data.userId,
      action_type: 'plm_maturity_recomputed',
      summary: `Recomputed PLM maturity (${result.overallScore.toFixed(2)})`,
      details: {
        overallScore: result.overallScore,
        rlaifEvaluationCount: result.rlaifEvaluationCount,
        trainingPairCount: result.trainingPairCount
      },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
