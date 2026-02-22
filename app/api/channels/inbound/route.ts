import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getOrchestrator } from '@/lib/factory';
import { getChannelAdapter } from '@/lib/channels';

const InboundSchema = z.object({
  channel: z.string().min(1),
  userId: z.string().uuid(),
  externalContactId: z.string().min(1),
  messageId: z.string().min(1),
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
    const parsed = InboundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { channel, userId, externalContactId, messageId, text, audience } = parsed.data;
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    let inboundRow: { id: string } | null = null;
    const { data: insertedInbound, error: inboundError } = await supabase
      .from('channel_messages')
      .insert({
        user_id: userId,
        channel,
        direction: 'inbound',
        external_contact_id: externalContactId,
        external_message_id: messageId,
        content: text,
        audience,
        status: 'processing',
        updated_at: nowIso
      })
      .select('id')
      .single();

    if (inboundError) {
      // Idempotency path: inbound message already stored.
      const duplicate = inboundError.message.includes('idx_channel_messages_idempotency') || inboundError.code === '23505';
      if (!duplicate) {
        return NextResponse.json({ error: inboundError.message || 'Failed to store inbound channel row' }, { status: 500 });
      }

      const { data: existingRow, error: existingError } = await supabase
        .from('channel_messages')
        .select('id, status')
        .eq('user_id', userId)
        .eq('channel', channel)
        .eq('direction', 'inbound')
        .eq('external_contact_id', externalContactId)
        .eq('external_message_id', messageId)
        .maybeSingle();

      if (existingError || !existingRow?.id) {
        return NextResponse.json({ error: 'Duplicate inbound message detected but existing row lookup failed' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        queued: false,
        duplicate: true,
        channelMessageId: existingRow.id,
        status: existingRow.status
      });
    }

    inboundRow = insertedInbound;
    if (!inboundRow?.id) {
      return NextResponse.json({ error: 'Failed to store inbound channel row' }, { status: 500 });
    }

    const { data: queueRow, error: queueError } = await supabase
      .from('editor_messages')
      .insert({
        user_id: userId,
        content: text,
        message_type: 'system_note',
        priority: audience === 'author' ? 'medium' : 'low',
        metadata: {
          inbound: true,
          channel,
          externalContactId,
          messageId,
          audience
        }
      })
      .select('id')
      .single();

    if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 });

    let autoReply: { sent: boolean; preview: string; error?: string } | null = null;

    if (audience === 'external') {
      try {
        const orchestrator = getOrchestrator();
        const { response } = await orchestrator.generateResponse(
          [{ role: 'user', content: text }],
          userId,
          {
            temperature: 0.7,
            privacyMode: 'professional',
            contactId: externalContactId,
            audience: 'external'
          }
        );

        const adapter = getChannelAdapter(channel);
        const delivery = await adapter.send({
          channel,
          externalContactId,
          userId,
          text: response,
          audience
        });

        autoReply = {
          sent: delivery.success,
          preview: response.slice(0, 200),
          error: delivery.error
        };

        await supabase
          .from('channel_messages')
          .insert({
            user_id: userId,
            channel,
            direction: 'outbound',
            external_contact_id: externalContactId,
            external_message_id: delivery.providerMessageId || null,
            content: response,
            audience,
            status: delivery.success ? 'sent' : 'failed',
            error: delivery.error || null,
            metadata: {
              sourceInboundId: inboundRow.id
            },
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        autoReply = {
          sent: false,
          preview: '',
          error: error instanceof Error ? error.message : 'Auto-reply failed'
        };
      }
    }

    await supabase
      .from('channel_messages')
      .update({
        status: 'acked',
        metadata: {
          queueId: queueRow.id,
          autoReplySent: autoReply?.sent || false
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', inboundRow.id);

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'channel_message_ingested',
      summary: `Ingested ${channel} inbound message (${audience})`,
      details: {
        channel,
        externalContactId,
        messageId,
        queueId: queueRow.id,
        autoReply,
        channelMessageId: inboundRow.id
      },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      queued: true,
      channelMessageId: inboundRow.id,
      queueId: queueRow.id,
      autoReply
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
