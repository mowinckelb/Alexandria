import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const RequeueSchema = z.object({
  userId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(100)
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

    const { userId, ids } = parsed.data;
    const supabase = getSupabase();
    const { data: rows, error: fetchError } = await supabase
      .from('channel_messages')
      .select('id, metadata')
      .eq('user_id', userId)
      .in('id', ids);
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    for (const row of rows || []) {
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
            requeuedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'channel_messages_requeued',
      summary: `Requeued ${ids.length} channel messages`,
      details: { ids },
      requires_attention: false
    });

    return NextResponse.json({ success: true, requeued: ids.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
