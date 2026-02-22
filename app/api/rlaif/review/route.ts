import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ConstitutionManager } from '@/lib/modules/constitution/manager';
import { recomputePlmMaturity } from '@/lib/modules/core/plm-maturity';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

const ReviewSchema = z.object({
  userId: z.string().uuid(),
  evaluationId: z.string().uuid(),
  verdict: z.enum(['approved', 'rejected', 'edited']),
  editedResponse: z.string().optional(),
  comment: z.string().optional()
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
      userId: request.nextUrl.searchParams.get('userId'),
      limit: request.nextUrl.searchParams.get('limit') || 20
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, limit } = parsed.data;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('rlaif_evaluations')
      .select('*')
      .eq('user_id', userId)
      .in('routing', ['author_review', 'flagged'])
      .is('author_verdict', null)
      .order('created_at', { ascending: false })
      .limit(limit || 20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data || [],
      count: (data || []).length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, evaluationId, verdict, editedResponse, comment } = parsed.data;
    const supabase = getSupabase();
    const constitutionManager = new ConstitutionManager();

    const update: Record<string, unknown> = {
      author_verdict: verdict,
      reviewer_comment: comment || null,
      reviewed_at: new Date().toISOString()
    };

    if (verdict === 'edited' && editedResponse) {
      update.plm_response = editedResponse;
    }

    const { error } = await supabase
      .from('rlaif_evaluations')
      .update(update)
      .eq('id', evaluationId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'rlaif_review_submitted',
      summary: `Submitted RLAIF review: ${verdict}`,
      details: { evaluationId, verdict },
      requires_attention: false
    });

    await constitutionManager.recomputeGapScores(userId);
    await recomputePlmMaturity(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
