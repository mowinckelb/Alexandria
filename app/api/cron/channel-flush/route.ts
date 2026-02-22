import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getChannelAdapter } from '@/lib/channels';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data: bindings, error: bindingsError } = await supabase
      .from('channel_bindings')
      .select('user_id, channel, external_contact_id, audience, max_messages_per_flush, min_interval_seconds, paused_until')
      .eq('is_active', true)
      .limit(200);
    if (bindingsError) return NextResponse.json({ error: bindingsError.message }, { status: 500 });

    let attempted = 0;
    let sent = 0;
    let failed = 0;

    for (const binding of bindings || []) {
      if (binding.paused_until && new Date(binding.paused_until).getTime() > Date.now()) {
        continue;
      }

      if ((binding.min_interval_seconds || 0) > 0) {
        const { data: lastOutbound } = await supabase
          .from('channel_messages')
          .select('created_at')
          .eq('user_id', binding.user_id)
          .eq('channel', binding.channel)
          .eq('external_contact_id', binding.external_contact_id)
          .eq('direction', 'outbound')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastOutbound?.created_at) {
          const elapsedSec = (Date.now() - new Date(lastOutbound.created_at).getTime()) / 1000;
          if (elapsedSec < (binding.min_interval_seconds || 0)) {
            continue;
          }
        }
      }

      const { data: pending } = await supabase
        .from('editor_messages')
        .select('id, content')
        .eq('user_id', binding.user_id)
        .eq('delivered', false)
        .order('created_at', { ascending: true })
        .limit(binding.max_messages_per_flush || 5);

      if (!pending || pending.length === 0) continue;
      let adapter;
      try {
        adapter = getChannelAdapter(binding.channel);
      } catch {
        failed += pending.length;
        for (const row of pending) {
          await supabase.from('channel_messages').insert({
            user_id: binding.user_id,
            channel: binding.channel,
            direction: 'outbound',
            external_contact_id: binding.external_contact_id,
            external_message_id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            content: row.content,
            audience: binding.audience,
            status: 'failed',
            error: `Unsupported channel: ${binding.channel}`,
            metadata: {
              source: 'cron-channel-flush',
              editorMessageId: row.id
            },
            updated_at: new Date().toISOString()
          });
        }
        continue;
      }

      for (const row of pending) {
        attempted += 1;
        try {
          const delivery = await adapter.send({
            channel: binding.channel,
            userId: binding.user_id,
            externalContactId: binding.external_contact_id,
            text: row.content,
            audience: binding.audience
          });

          const pendingOutboundId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          await supabase.from('channel_messages').insert({
            user_id: binding.user_id,
            channel: binding.channel,
            direction: 'outbound',
            external_contact_id: binding.external_contact_id,
            external_message_id: delivery.providerMessageId || pendingOutboundId,
            content: row.content,
            audience: binding.audience,
            status: delivery.success ? 'sent' : 'failed',
            error: delivery.error || null,
            metadata: {
              source: 'cron-channel-flush',
              editorMessageId: row.id,
              diagnostics: delivery.diagnostics || null
            },
            updated_at: new Date().toISOString()
          });

          if (delivery.success) {
            sent += 1;
            await supabase
              .from('editor_messages')
              .update({
                delivered: true,
                delivered_at: new Date().toISOString()
              })
              .eq('user_id', binding.user_id)
              .eq('id', row.id);
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      bindingsScanned: (bindings || []).length,
      attempted,
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

export async function GET(request: NextRequest) {
  return POST(request);
}
