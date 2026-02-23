import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid(),
  markStaleIfNoBindings: z.boolean().optional().default(true),
  staleHours: z.number().int().min(1).max(720).optional().default(72)
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function getBaseUrl(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, markStaleIfNoBindings, staleHours } = parsed.data;
    const supabase = getSupabase();
    const startedAt = Date.now();

    const { count: undeliveredBefore } = await supabase
      .from('editor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivered', false);

    const baseUrl = getBaseUrl(request);
    const headers: Record<string, string> = {};
    if (process.env.CRON_SECRET) {
      headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
    }
    const flushResponse = await fetch(`${baseUrl}/api/cron/channel-flush?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers
    });
    const flushBody = await flushResponse.json().catch(() => null);

    const { count: activeBindings } = await supabase
      .from('channel_bindings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    let staleMarkedDelivered = 0;
    if (markStaleIfNoBindings && (activeBindings || 0) === 0) {
      const staleCutoffIso = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();
      const { data: staleRows, error: staleError } = await supabase
        .from('editor_messages')
        .select('id')
        .eq('user_id', userId)
        .eq('delivered', false)
        .lt('created_at', staleCutoffIso)
        .limit(500);
      if (staleError) {
        return NextResponse.json({ error: staleError.message }, { status: 500 });
      }

      const staleIds = (staleRows || []).map((row) => row.id);
      if (staleIds.length > 0) {
        const { error: updateError } = await supabase
          .from('editor_messages')
          .update({
            delivered: true,
            delivered_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .in('id', staleIds);
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        staleMarkedDelivered = staleIds.length;
      }
    }

    const { count: undeliveredAfter } = await supabase
      .from('editor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivered', false);

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'machine_drain_editor_messages',
      summary: 'Drained editor message queue',
      details: {
        undeliveredBefore: undeliveredBefore || 0,
        undeliveredAfter: undeliveredAfter || 0,
        staleMarkedDelivered,
        activeBindings: activeBindings || 0,
        channelFlushOk: flushResponse.ok
      },
      requires_attention: !flushResponse.ok
    });

    return NextResponse.json({
      success: true,
      elapsedMs: Date.now() - startedAt,
      undeliveredBefore: undeliveredBefore || 0,
      undeliveredAfter: undeliveredAfter || 0,
      activeBindings: activeBindings || 0,
      staleMarkedDelivered,
      channelFlush: {
        ok: flushResponse.ok,
        status: flushResponse.status,
        body: flushBody
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
