import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId')
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('plm_maturity')
      .select('*')
      .eq('user_id', parsed.data.userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
      return NextResponse.json({
        userId: parsed.data.userId,
        overallScore: 0,
        domainScores: {},
        trainingPairCount: 0,
        rlaifEvaluationCount: 0
      });
    }

    return NextResponse.json({
      userId: data.user_id,
      overallScore: data.overall_score,
      domainScores: data.domain_scores || {},
      trainingPairCount: data.training_pair_count || 0,
      rlaifEvaluationCount: data.rlaif_evaluation_count || 0,
      updatedAt: data.updated_at
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
