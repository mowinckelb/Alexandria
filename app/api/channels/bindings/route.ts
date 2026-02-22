import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const QuerySchema = z.object({
  userId: z.string().uuid().optional()
});

const UpsertSchema = z.object({
  userId: z.string().uuid(),
  channel: z.string().min(1),
  externalContactId: z.string().min(1),
  privacyMode: z.enum(['private', 'personal', 'professional']).optional(),
  audience: z.enum(['author', 'external']).optional(),
  isActive: z.boolean().optional(),
  maxMessagesPerFlush: z.number().int().min(1).max(100).optional(),
  minIntervalSeconds: z.number().int().min(0).max(86400).optional(),
  pausedUntil: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const DeleteSchema = z.object({
  channel: z.string().min(1),
  externalContactId: z.string().min(1)
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

export async function GET(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId') || undefined
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    let query = supabase.from('channel_bindings').select('*').order('created_at', { ascending: false }).limit(200);
    if (parsed.data.userId) query = query.eq('user_id', parsed.data.userId);
    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [], count: (data || []).length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const {
      userId,
      channel,
      externalContactId,
      privacyMode,
      audience,
      isActive,
      maxMessagesPerFlush,
      minIntervalSeconds,
      pausedUntil,
      metadata
    } = parsed.data;

    const { data: existing } = await supabase
      .from('channel_bindings')
      .select('max_messages_per_flush, min_interval_seconds, paused_until, metadata, privacy_mode, audience, is_active')
      .eq('channel', channel)
      .eq('external_contact_id', externalContactId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('channel_bindings')
      .upsert({
        user_id: userId,
        channel,
        external_contact_id: externalContactId,
        privacy_mode: privacyMode ?? existing?.privacy_mode ?? 'professional',
        audience: audience ?? existing?.audience ?? 'external',
        is_active: isActive ?? existing?.is_active ?? true,
        max_messages_per_flush: maxMessagesPerFlush ?? existing?.max_messages_per_flush ?? 5,
        min_interval_seconds: minIntervalSeconds ?? existing?.min_interval_seconds ?? 0,
        paused_until: pausedUntil ?? existing?.paused_until ?? null,
        metadata: metadata ?? existing?.metadata ?? {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'channel,external_contact_id' })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, binding: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!authorizeChannelRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('channel_bindings')
      .delete()
      .eq('channel', parsed.data.channel)
      .eq('external_contact_id', parsed.data.externalContactId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
