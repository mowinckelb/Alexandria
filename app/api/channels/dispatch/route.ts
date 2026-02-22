import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getChannelAdapter } from '@/lib/channels';
import { createClient } from '@supabase/supabase-js';

const DispatchSchema = z.object({
  channel: z.string().min(1),
  userId: z.string().uuid(),
  externalContactId: z.string().min(1),
  text: z.string().min(1),
  audience: z.enum(['author', 'external']).default('author')
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
    const parsed = DispatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { channel, userId, externalContactId, text, audience } = parsed.data;
    const supabase = getSupabase();
    const { data: row, error: insertError } = await supabase
      .from('channel_messages')
      .insert({
        user_id: userId,
        channel,
        direction: 'outbound',
        external_contact_id: externalContactId,
        content: text,
        audience,
        status: 'processing'
      })
      .select('id')
      .single();
    if (insertError || !row?.id) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create channel message row' }, { status: 500 });
    }

    const adapter = getChannelAdapter(channel);
    const result = await adapter.send({
      channel,
      userId,
      externalContactId,
      text,
      audience
    });

    await supabase
      .from('channel_messages')
      .update({
        status: result.success ? 'sent' : 'failed',
        external_message_id: result.providerMessageId || null,
        error: result.error || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'channel_message_dispatched',
      summary: `Dispatched ${channel} outbound message (${audience})`,
      details: {
        channel,
        externalContactId,
        success: result.success,
        providerMessageId: result.providerMessageId || null,
        channelMessageId: row.id
      },
      requires_attention: !result.success
    });

    return NextResponse.json({
      success: result.success,
      channelMessageId: row.id,
      channel,
      providerMessageId: result.providerMessageId || null,
      deliveredAt: result.deliveredAt || null,
      error: result.error || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
