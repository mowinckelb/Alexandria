import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const RequeueSchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional()
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
      userId: request.nextUrl.searchParams.get('userId'),
      limit: request.nextUrl.searchParams.get('limit') || 50
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('user_id', parsed.data.userId)
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(parsed.data.limit || 50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const items = (data || []).filter((row) => Boolean((row.metadata || {}).deadLetter));
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const parsed = RequeueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('channel_messages')
      .select('id, metadata')
      .eq('user_id', parsed.data.userId)
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(parsed.data.limit || 50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const dead = (data || []).filter((row) => Boolean((row.metadata || {}).deadLetter));
    for (const row of dead) {
      const metadata = (row.metadata || {}) as Record<string, unknown>;
      await supabase
        .from('channel_messages')
        .update({
          status: 'failed',
          error: null,
          metadata: {
            ...metadata,
            retryAttempts: 0,
            deadLetter: false,
            deadLetterAt: null,
            requeuedAt: new Date().toISOString(),
            requeueSource: 'dead-letter-endpoint'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);
    }

    return NextResponse.json({ success: true, requeued: dead.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
