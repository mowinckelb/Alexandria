import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getChannelAdapter } from '@/lib/channels';

const FlushSchema = z.object({
  userId: z.string().uuid(),
  channel: z.string().min(1),
  externalContactId: z.string().min(1),
  audience: z.enum(['author', 'external']).default('author'),
  limit: z.number().int().min(1).max(100).optional()
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
    const parsed = FlushSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, channel, externalContactId, audience, limit } = parsed.data;
    const supabase = getSupabase();
    const adapter = getChannelAdapter(channel);

    const { data: pending, error } = await supabase
      .from('editor_messages')
      .select('id, content')
      .eq('user_id', userId)
      .eq('delivered', false)
      .order('created_at', { ascending: true })
      .limit(limit || 20);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let sent = 0;
    let failed = 0;
    const deliveredIds: string[] = [];

    for (const row of pending || []) {
      try {
        const delivery = await adapter.send({
          channel,
          userId,
          externalContactId,
          text: row.content,
          audience
        });

        await supabase.from('channel_messages').insert({
          user_id: userId,
          channel,
          direction: 'outbound',
          external_contact_id: externalContactId,
          external_message_id: delivery.providerMessageId || null,
          content: row.content,
          audience,
          status: delivery.success ? 'sent' : 'failed',
          error: delivery.error || null,
          metadata: { source: 'flush-editor', editorMessageId: row.id },
          updated_at: new Date().toISOString()
        });

        if (delivery.success) {
          deliveredIds.push(row.id);
          sent += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    if (deliveredIds.length > 0) {
      await supabase
        .from('editor_messages')
        .update({
          delivered: true,
          delivered_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('id', deliveredIds);
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'editor_messages_flushed_to_channel',
      summary: `Flushed ${sent} editor messages to ${channel}`,
      details: {
        channel,
        externalContactId,
        sent,
        failed,
        attempted: (pending || []).length
      },
      requires_attention: failed > 0
    });

    return NextResponse.json({
      success: true,
      attempted: (pending || []).length,
      sent,
      failed
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
