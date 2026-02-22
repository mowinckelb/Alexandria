import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

const AckSchema = z.object({
  action: z.literal('ack'),
  userId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(100)
});

const EnqueueSchema = z.object({
  action: z.literal('enqueue'),
  userId: z.string().uuid(),
  content: z.string().min(1),
  messageType: z.enum(['proactive_question', 'gap_alert', 'contradiction_alert', 'feedback_request', 'system_note']).default('system_note'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  metadata: z.record(z.string(), z.unknown()).optional()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId'),
      limit: request.nextUrl.searchParams.get('limit') || 20
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, limit } = parsed.data;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('editor_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('delivered', false)
      .order('created_at', { ascending: false })
      .limit(limit || 20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      messages: data || [],
      count: (data || []).length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabase();

    if (body?.action === 'ack') {
      const parsed = AckSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid ack request', details: parsed.error.issues }, { status: 400 });
      }

      const { userId, ids } = parsed.data;
      const { error } = await supabase
        .from('editor_messages')
        .update({
          delivered: true,
          delivered_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('id', ids);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, acknowledged: ids.length });
    }

    if (body?.action === 'enqueue') {
      const parsed = EnqueueSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid enqueue request', details: parsed.error.issues }, { status: 400 });
      }

      const { userId, content, messageType, priority, metadata } = parsed.data;
      const { data, error } = await supabase
        .from('editor_messages')
        .insert({
          user_id: userId,
          content,
          message_type: messageType,
          priority,
          metadata: metadata || {}
        })
        .select('id')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, id: data.id });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
