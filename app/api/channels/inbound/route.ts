import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getOrchestrator } from '@/lib/factory';
import { getChannelAdapter } from '@/lib/channels';
import { createHmac, timingSafeEqual } from 'crypto';

const InboundSchema = z.object({
  channel: z.string().min(1),
  userId: z.string().uuid().optional(),
  externalContactId: z.string().min(1),
  messageId: z.string().min(1),
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

function verifyIncomingSignature(request: NextRequest, rawBody: string): boolean {
  const signingSecret = process.env.CHANNEL_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) return true;

  const provider = request.headers.get('x-channel-provider');
  if (!provider || (provider !== 'webhook' && provider !== 'sms_bridge')) return true;

  const timestamp = request.headers.get('x-channel-timestamp');
  const signature = request.headers.get('x-channel-signature');
  if (!timestamp || !signature) return false;

  const expected = createHmac('sha256', signingSecret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.text();
    if (!verifyIncomingSignature(request, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = InboundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { channel, userId, externalContactId, messageId, text } = parsed.data;
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    const { data: binding } = await supabase
      .from('channel_bindings')
      .select('user_id, privacy_mode, audience, is_active')
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
    const resolvedPrivacyMode = (binding?.privacy_mode as 'private' | 'personal' | 'professional' | undefined) || 'professional';

    let inboundRow: { id: string } | null = null;
    const { data: insertedInbound, error: inboundError } = await supabase
      .from('channel_messages')
      .insert({
        user_id: resolvedUserId,
        channel,
        direction: 'inbound',
        external_contact_id: externalContactId,
        external_message_id: messageId,
        content: text,
        audience: resolvedAudience,
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
        .eq('user_id', resolvedUserId)
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
        user_id: resolvedUserId,
        content: text,
        message_type: 'system_note',
        priority: resolvedAudience === 'author' ? 'medium' : 'low',
        metadata: {
          inbound: true,
          channel,
          externalContactId,
          messageId,
          audience: resolvedAudience
        }
      })
      .select('id')
      .single();

    if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 });

    let autoReply: {
      sent: boolean;
      preview: string;
      error?: string;
      diagnostics?: {
        provider: string;
        statusCode?: number;
        latencyMs?: number;
        responsePreview?: string;
      };
    } | null = null;

    if (resolvedAudience === 'external') {
      try {
        const pendingOutboundId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const orchestrator = getOrchestrator();
        const { response } = await orchestrator.generateResponse(
          [{ role: 'user', content: text }],
          resolvedUserId,
          {
            temperature: 0.7,
            privacyMode: resolvedPrivacyMode,
            contactId: externalContactId,
            audience: 'external'
          }
        );

        const adapter = getChannelAdapter(channel);
        const delivery = await adapter.send({
          channel,
          externalContactId,
          userId: resolvedUserId,
          text: response,
          audience: resolvedAudience
        });

        autoReply = {
          sent: delivery.success,
          preview: response.slice(0, 200),
          error: delivery.error,
          diagnostics: delivery.diagnostics
        };

        await supabase
          .from('channel_messages')
          .insert({
            user_id: resolvedUserId,
            channel,
            direction: 'outbound',
            external_contact_id: externalContactId,
            external_message_id: delivery.providerMessageId || pendingOutboundId,
            content: response,
            audience: resolvedAudience,
            status: delivery.success ? 'sent' : 'failed',
            error: delivery.error || null,
            metadata: {
              sourceInboundId: inboundRow.id,
              diagnostics: delivery.diagnostics || null
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
      user_id: resolvedUserId,
      action_type: 'channel_message_ingested',
      summary: `Ingested ${channel} inbound message (${resolvedAudience})`,
      details: {
        channel,
        externalContactId,
        messageId,
        bindingResolved: !!binding,
        privacyMode: resolvedPrivacyMode,
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
