import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid()
});

const CreateSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100)
});

const DeleteSchema = z.object({
  userId: z.string().uuid(),
  id: z.string().uuid()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function generateApiKey(): string {
  return `ax_${randomBytes(24).toString('hex')}`;
}

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId')
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used')
      .eq('user_id', parsed.data.userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ keys: data || [] });
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
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const key = generateApiKey();

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: parsed.data.userId,
        key,
        name: parsed.data.name
      })
      .select('id, name, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('persona_activity').insert({
      user_id: parsed.data.userId,
      action_type: 'api_key_created',
      summary: `Created API key "${parsed.data.name}"`,
      details: { apiKeyId: data.id, name: parsed.data.name },
      requires_attention: false
    });

    return NextResponse.json({ success: true, key, record: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', parsed.data.id)
      .eq('user_id', parsed.data.userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('persona_activity').insert({
      user_id: parsed.data.userId,
      action_type: 'api_key_deleted',
      summary: 'Deleted API key',
      details: { apiKeyId: parsed.data.id },
      requires_attention: false
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
