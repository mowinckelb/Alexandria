import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const QuerySchema = z.object({
  userId: z.string().uuid()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function authorizeChannelRequest(request: NextRequest): boolean {
  const secret = process.env.CHANNEL_SHARED_SECRET;
  if (!secret) return true;
  const direct = request.headers.get('x-channel-secret');
  const auth = request.headers.get('authorization');
  if (direct && direct === secret) return true;
  if (auth === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId')
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('channel_messages')
      .select('channel, direction, status, created_at, metadata')
      .eq('user_id', parsed.data.userId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const countByStatus = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    const countByDirection = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.direction] = (acc[row.direction] || 0) + 1;
      return acc;
    }, {});
    const deadLetterCount = rows.filter((row) => Boolean((row.metadata || {}).deadLetter)).length;
    const byChannel = rows.reduce<Record<string, { sent: number; failed: number; total: number; avgLatencyMs: number | null }>>((acc, row) => {
      const channel = (row as { channel?: string }).channel || 'unknown';
      if (!acc[channel]) {
        acc[channel] = { sent: 0, failed: 0, total: 0, avgLatencyMs: null };
      }
      acc[channel].total += 1;
      if (row.status === 'sent') acc[channel].sent += 1;
      if (row.status === 'failed') acc[channel].failed += 1;
      return acc;
    }, {});

    const latencyBuckets: Record<string, { total: number; count: number }> = {};
    for (const row of rows) {
      const channel = (row as { channel?: string }).channel || 'unknown';
      const latency = Number((row.metadata || {}).diagnostics?.latencyMs);
      if (!Number.isFinite(latency) || latency <= 0) continue;
      if (!latencyBuckets[channel]) latencyBuckets[channel] = { total: 0, count: 0 };
      latencyBuckets[channel].total += latency;
      latencyBuckets[channel].count += 1;
    }
    for (const channel of Object.keys(byChannel)) {
      const bucket = latencyBuckets[channel];
      byChannel[channel].avgLatencyMs = bucket && bucket.count > 0
        ? Number((bucket.total / bucket.count).toFixed(2))
        : null;
    }

    return NextResponse.json({
      total: rows.length,
      byStatus: countByStatus,
      byDirection: countByDirection,
      retryBacklog: countByStatus.failed || 0,
      deadLetter: deadLetterCount,
      byChannel
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
