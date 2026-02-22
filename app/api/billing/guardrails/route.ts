import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid()
});

const DAILY_API_KEY_SPEND_LIMIT_USD = Number(process.env.BILLING_DAILY_API_KEY_LIMIT_USD || '0');

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
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, last_used')
      .eq('user_id', parsed.data.userId);
    if (keysError) return NextResponse.json({ error: keysError.message }, { status: 500 });

    const keyIds = (keys || []).map((k) => k.id);
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: usageRows, error: usageError } = await supabase
      .from('api_usage')
      .select('api_key_id, cost, created_at')
      .in('api_key_id', keyIds.length > 0 ? keyIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', sinceIso)
      .limit(10000);
    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 });

    const spendByKey = (usageRows || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.api_key_id] = Number(((acc[row.api_key_id] || 0) + Number(row.cost || 0)).toFixed(6));
      return acc;
    }, {});

    const keysSummary = (keys || []).map((key) => {
      const spend24h = Number((spendByKey[key.id] || 0).toFixed(6));
      const utilization = DAILY_API_KEY_SPEND_LIMIT_USD > 0
        ? Number(((spend24h / DAILY_API_KEY_SPEND_LIMIT_USD) * 100).toFixed(2))
        : null;
      return {
        id: key.id,
        name: key.name,
        spend24hUsd: spend24h,
        lastUsed: key.last_used,
        utilizationPct: utilization
      };
    }).sort((a, b) => b.spend24hUsd - a.spend24hUsd);

    const alerts = keysSummary
      .filter((row) => DAILY_API_KEY_SPEND_LIMIT_USD > 0 && row.spend24hUsd >= DAILY_API_KEY_SPEND_LIMIT_USD * 0.8)
      .map((row) => ({
        severity: row.spend24hUsd >= DAILY_API_KEY_SPEND_LIMIT_USD ? 'high' : 'medium',
        message: `${row.name} is at $${row.spend24hUsd.toFixed(6)} in the last 24h`,
        apiKeyId: row.id
      }));

    return NextResponse.json({
      limits: {
        dailyApiKeySpendLimitUsd: DAILY_API_KEY_SPEND_LIMIT_USD > 0 ? DAILY_API_KEY_SPEND_LIMIT_USD : null
      },
      window: {
        start: sinceIso,
        end: new Date().toISOString()
      },
      keys: keysSummary,
      alerts
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
