import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getOrchestrator } from '@/lib/factory';

const BodySchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional()
});

const ESTIMATED_LLM_INPUT_COST_PER_CHAR_USD = 0.0000008;
const ESTIMATED_PERSONA_QUERY_REVENUE_USD = 0.0025;
const DAILY_API_KEY_SPEND_LIMIT_USD = Number(process.env.BILLING_DAILY_API_KEY_LIMIT_USD || '0');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function extractApiKey(request: NextRequest): string | null {
  const direct = request.headers.get('x-api-key');
  if (direct) return direct.trim();
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { query, sessionId, temperature } = parsed.data;
    const estimatedExpenseUsd = Number((query.length * ESTIMATED_LLM_INPUT_COST_PER_CHAR_USD).toFixed(6));
    const estimatedIncomeUsd = ESTIMATED_PERSONA_QUERY_REVENUE_USD;

    if (DAILY_API_KEY_SPEND_LIMIT_USD > 0) {
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: usageRows, error: usageWindowError } = await supabase
        .from('api_usage')
        .select('cost')
        .eq('api_key_id', keyRecord.id)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (usageWindowError) {
        return NextResponse.json({ error: usageWindowError.message }, { status: 500 });
      }
      const current24hSpend = (usageRows || []).reduce((sum, row) => sum + Number(row.cost || 0), 0);
      const projectedSpend = Number((current24hSpend + estimatedExpenseUsd).toFixed(6));
      if (projectedSpend > DAILY_API_KEY_SPEND_LIMIT_USD) {
        await supabase.from('persona_activity').insert({
          user_id: keyRecord.user_id,
          action_type: 'billing_guardrail_blocked_query',
          summary: `Blocked external query for API key due to daily spend limit`,
          details: {
            apiKeyId: keyRecord.id,
            current24hSpend: Number(current24hSpend.toFixed(6)),
            estimatedExpenseUsd,
            projectedSpend,
            dailyLimitUsd: DAILY_API_KEY_SPEND_LIMIT_USD
          },
          requires_attention: true
        });
        return NextResponse.json(
          {
            error: 'Daily spend limit exceeded for this API key',
            guardrail: {
              current24hSpendUsd: Number(current24hSpend.toFixed(6)),
              estimatedNextQueryUsd: estimatedExpenseUsd,
              projected24hSpendUsd: projectedSpend,
              dailyLimitUsd: DAILY_API_KEY_SPEND_LIMIT_USD
            }
          },
          { status: 429 }
        );
      }
    }

    const orchestrator = getOrchestrator();
    const { stream } = await orchestrator.handleQuery(
      [{ role: 'user', content: query }],
      keyRecord.user_id,
      {
        sessionId,
        temperature: temperature ?? 0.7,
        privacyMode: 'professional',
        contactId: keyRecord.id,
        audience: 'external'
      }
    );

    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyRecord.id);

    await supabase
      .from('api_usage')
      .insert({
        api_key_id: keyRecord.id,
        query,
        response_length: -1,
        cost: estimatedExpenseUsd
      });

    await supabase.from('user_income_ledger').insert({
      user_id: keyRecord.user_id,
      category: 'persona_api',
      amount_usd: estimatedIncomeUsd,
      source_ref: keyRecord.id,
      details: {
        note: 'estimated flat query revenue; replace with tiered pricing engine',
        queryPreview: query.slice(0, 120),
        estimated: true
      }
    });

    await supabase.from('user_expense_ledger').insert({
      user_id: keyRecord.user_id,
      category: 'llm_api',
      amount_usd: estimatedExpenseUsd,
      source_ref: keyRecord.id,
      details: {
        note: 'estimated from query length; replace with token accounting',
        queryChars: query.length,
        estimated: true
      }
    });

    await supabase.from('persona_activity').insert({
      user_id: keyRecord.user_id,
      action_type: 'external_persona_query',
      summary: 'External API persona query served',
      details: {
        apiKeyId: keyRecord.id,
        queryPreview: query.slice(0, 120)
      },
      requires_attention: false
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
