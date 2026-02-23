import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getChannelAdapter } from '@/lib/channels';

const AUTO_PAUSE_FAILURE_THRESHOLD = 8;
const AUTO_PAUSE_WINDOW_MINUTES = 30;
const AUTO_PAUSE_DURATION_MINUTES = 30;

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
    const scopedUserId = request.nextUrl.searchParams.get('userId');
    let failedQuery = supabase
      .from('channel_messages')
      .select('*')
      .eq('direction', 'outbound')
      .eq('status', 'failed')
      .order('updated_at', { ascending: true })
      .limit(25);
    if (scopedUserId) {
      failedQuery = failedQuery.eq('user_id', scopedUserId);
    }
    const { data: failedRows, error } = await failedQuery;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let retried = 0;
    let succeeded = 0;
    let skipped = 0;
    let autoPausedBindings = 0;
    const touchedBindings = new Set<string>();

    for (const row of failedRows || []) {
      touchedBindings.add(`${row.user_id}::${row.channel}::${row.external_contact_id}`);
      const metadata = (row.metadata || {}) as Record<string, unknown>;
      const attempts = Number(metadata.retryAttempts || 0);
      const nextMetadata = {
        ...metadata,
        retryAttempts: attempts + 1,
        lastRetryAt: new Date().toISOString()
      };
      if (attempts >= 3) {
        await supabase
          .from('channel_messages')
          .update({
            metadata: {
              ...metadata,
              deadLetter: true,
              deadLetterAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);
        skipped += 1;
        continue;
      }

      retried += 1;
      await supabase
        .from('channel_messages')
        .update({
          status: 'processing',
          metadata: nextMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      try {
        const adapter = getChannelAdapter(row.channel);
        const result = await adapter.send({
          channel: row.channel,
          userId: row.user_id,
          externalContactId: row.external_contact_id,
          text: row.content,
          audience: row.audience
        });

        await supabase
          .from('channel_messages')
          .update({
            status: result.success ? 'sent' : 'failed',
            external_message_id: result.providerMessageId || row.external_message_id,
            error: result.error || null,
            metadata: {
              ...nextMetadata,
              deadLetter: !result.success && attempts + 1 >= 3,
              deadLetterAt: !result.success && attempts + 1 >= 3 ? new Date().toISOString() : null,
              diagnostics: result.diagnostics || null
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);

        if (result.success) succeeded += 1;
      } catch (retryError) {
        await supabase
          .from('channel_messages')
          .update({
            status: 'failed',
            error: retryError instanceof Error ? retryError.message : 'Retry failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);
      }
    }

    const windowStartIso = new Date(Date.now() - AUTO_PAUSE_WINDOW_MINUTES * 60 * 1000).toISOString();
    for (const bindingKey of touchedBindings) {
      const [userId, channel, externalContactId] = bindingKey.split('::');
      const { data: binding } = await supabase
        .from('channel_bindings')
        .select('metadata, paused_until')
        .eq('user_id', userId)
        .eq('channel', channel)
        .eq('external_contact_id', externalContactId)
        .eq('is_active', true)
        .maybeSingle();
      if (!binding) continue;

      const alreadyPaused = binding.paused_until && new Date(binding.paused_until).getTime() > Date.now();
      if (alreadyPaused) continue;

      const { count: recentFailed } = await supabase
        .from('channel_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('channel', channel)
        .eq('external_contact_id', externalContactId)
        .eq('direction', 'outbound')
        .eq('status', 'failed')
        .gte('updated_at', windowStartIso);

      if ((recentFailed || 0) < AUTO_PAUSE_FAILURE_THRESHOLD) continue;

      const pauseUntilIso = new Date(Date.now() + AUTO_PAUSE_DURATION_MINUTES * 60 * 1000).toISOString();
      await supabase
        .from('channel_bindings')
        .update({
          paused_until: pauseUntilIso,
          metadata: {
            ...((binding.metadata as Record<string, unknown>) || {}),
            autoPaused: true,
            autoPausedAt: new Date().toISOString(),
            autoPauseReason: `High failure rate (${recentFailed} in ${AUTO_PAUSE_WINDOW_MINUTES}m)`,
            autoPauseThreshold: AUTO_PAUSE_FAILURE_THRESHOLD,
            autoPauseWindowMinutes: AUTO_PAUSE_WINDOW_MINUTES,
            autoPauseDurationMinutes: AUTO_PAUSE_DURATION_MINUTES
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('channel', channel)
        .eq('external_contact_id', externalContactId);
      autoPausedBindings += 1;
    }

    return NextResponse.json({
      success: true,
      scanned: (failedRows || []).length,
      retried,
      succeeded,
      skipped,
      autoPausedBindings
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
