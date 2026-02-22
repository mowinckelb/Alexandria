import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getChannelAdapter } from '@/lib/channels';
import { createClient } from '@supabase/supabase-js';

const DispatchSchema = z.object({
  channel: z.string().min(1),
  userId: z.string().uuid().optional(),
  externalContactId: z.string().min(1),
  text: z.string().min(1),
  audience: z.enum(['author', 'external']).optional()
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

    const { channel, userId, externalContactId, text } = parsed.data;
    const supabase = getSupabase();
    const { data: binding } = await supabase
      .from('channel_bindings')
      .select('user_id, audience, is_active')
      .eq('channel', channel)
      .eq('external_contact_id', externalContactId)
      .maybeSingle();

    const resolvedUserId = userId || (binding?.is_active ? binding.user_id : null);
    if (!resolvedUserId) {
      return NextResponse.json(
        { error: 'Unable to resolve user. Provide userId or create an active channel binding.' },
        { status: 400 }
      );
    }
    const resolvedAudience = parsed.data.audience || (binding?.audience as 'author' | 'external' | undefined) || 'author';
    const pendingOutboundId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const { data: row, error: insertError } = await supabase
      .from('channel_messages')
      .insert({
        user_id: resolvedUserId,
        channel,
        direction: 'outbound',
        external_contact_id: externalContactId,
        external_message_id: pendingOutboundId,
        content: text,
        audience: resolvedAudience,
        status: 'processing'
      })
      .select('id')
      .single();
    if (insertError || !row?.id) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create channel message row' }, { status: 500 });
    }

    let adapter;
    try {
      adapter = getChannelAdapter(channel);
    } catch (adapterError) {
      await supabase
        .from('channel_messages')
        .update({
          status: 'failed',
          error: adapterError instanceof Error ? adapterError.message : 'Unsupported channel',
          metadata: {
            source: 'dispatch',
            bindingResolved: !!binding,
            diagnostics: null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);
      return NextResponse.json(
        { error: adapterError instanceof Error ? adapterError.message : 'Unsupported channel' },
        { status: 400 }
      );
    }

    const result = await adapter.send({
      channel,
      userId: resolvedUserId,
      externalContactId,
      text,
      audience: resolvedAudience
    });

    await supabase
      .from('channel_messages')
      .update({
        status: result.success ? 'sent' : 'failed',
        external_message_id: result.providerMessageId || null,
        error: result.error || null,
        metadata: {
          source: 'dispatch',
          bindingResolved: !!binding,
          diagnostics: result.diagnostics || null
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    await supabase.from('persona_activity').insert({
      user_id: resolvedUserId,
      action_type: 'channel_message_dispatched',
      summary: `Dispatched ${channel} outbound message (${resolvedAudience})`,
      details: {
        channel,
        externalContactId,
        bindingResolved: !!binding,
        success: result.success,
        providerMessageId: result.providerMessageId || null,
        diagnostics: result.diagnostics || null,
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
      diagnostics: result.diagnostics || null,
      error: result.error || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
