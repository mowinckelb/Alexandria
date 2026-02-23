import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid(),
  requeueDeadLetters: z.boolean().optional().default(true),
  deadLetterLimit: z.number().int().min(1).max(100).optional().default(50)
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

    const { userId, requeueDeadLetters, deadLetterLimit } = parsed.data;
    const supabase = getSupabase();
    const baseUrl = getBaseUrl(request);
    const startedAt = Date.now();
    let requeueResult: unknown = null;
    let retryResult: unknown = null;
    let deadLettersQueued = 0;

    if (requeueDeadLetters) {
      const { data: deadLetterRows, error: deadLetterError } = await supabase
        .from('channel_messages')
        .select('id')
        .eq('user_id', userId)
        .eq('direction', 'outbound')
        .contains('metadata', { deadLetter: true })
        .order('updated_at', { ascending: true })
        .limit(deadLetterLimit);
      if (deadLetterError) {
        return NextResponse.json({ error: deadLetterError.message }, { status: 500 });
      }

      const ids = (deadLetterRows || []).map((row) => row.id);
      deadLettersQueued = ids.length;
      if (ids.length > 0) {
        const requeueHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (process.env.CHANNEL_SHARED_SECRET) {
          requeueHeaders.authorization = `Bearer ${process.env.CHANNEL_SHARED_SECRET}`;
        }
        const requeueResponse = await fetch(`${baseUrl}/api/channels/requeue`, {
          method: 'POST',
          headers: requeueHeaders,
          body: JSON.stringify({ userId, ids })
        });
        requeueResult = {
          ok: requeueResponse.ok,
          status: requeueResponse.status,
          body: await requeueResponse.json().catch(() => null)
        };
      }
    }

    const retryHeaders: Record<string, string> = {};
    if (process.env.CRON_SECRET) {
      retryHeaders.authorization = `Bearer ${process.env.CRON_SECRET}`;
    }
    const retryResponse = await fetch(`${baseUrl}/api/cron/channel-retry?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: retryHeaders
    });
    retryResult = {
      ok: retryResponse.ok,
      status: retryResponse.status,
      body: await retryResponse.json().catch(() => null)
    };

    const { count: failedOutboundAfter } = await supabase
      .from('channel_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .eq('status', 'failed');
    const { count: deadLetterAfter } = await supabase
      .from('channel_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .contains('metadata', { deadLetter: true });

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'machine_recover_channels',
      summary: 'Recovered channel message backlog',
      details: {
        deadLettersQueued,
        failedOutboundAfter: failedOutboundAfter || 0,
        deadLetterAfter: deadLetterAfter || 0
      },
      requires_attention: !((retryResult as { ok?: boolean })?.ok)
    });

    return NextResponse.json({
      success: true,
      elapsedMs: Date.now() - startedAt,
      deadLettersQueued,
      failedOutboundAfter: failedOutboundAfter || 0,
      deadLetterAfter: deadLetterAfter || 0,
      requeueResult,
      retryResult
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
