import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { saveToVault } from '@/lib/utils/vault';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const CreateSchema = z.object({
  userId: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const RestoreSchema = z.object({
  userId: z.string().uuid(),
  checkpointId: z.string().uuid()
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

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_config_checkpoints')
      .select('*')
      .eq('user_id', parsed.data.userId)
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit || 20);
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
    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: current, error: currentError } = await supabase
      .from('system_configs')
      .select('version, config')
      .eq('user_id', parsed.data.userId)
      .maybeSingle();
    if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
    if (!current?.config) return NextResponse.json({ error: 'No system config found for user' }, { status: 404 });

    const label = parsed.data.label || `${current.version || 'custom'}-${new Date().toISOString()}`;
    const { data: inserted, error } = await supabase
      .from('system_config_checkpoints')
      .insert({
        user_id: parsed.data.userId,
        version_label: label,
        config: current.config,
        metadata: {
          source: 'manual_checkpoint',
          ...(parsed.data.metadata || {})
        }
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, checkpoint: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RestoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: checkpoint, error: checkpointError } = await supabase
      .from('system_config_checkpoints')
      .select('*')
      .eq('id', parsed.data.checkpointId)
      .eq('user_id', parsed.data.userId)
      .maybeSingle();
    if (checkpointError) return NextResponse.json({ error: checkpointError.message }, { status: 500 });
    if (!checkpoint) return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 });

    const nowIso = new Date().toISOString();
    await supabase
      .from('system_configs')
      .upsert({
        user_id: parsed.data.userId,
        version: checkpoint.version_label || 'restored',
        config: checkpoint.config,
        updated_at: nowIso
      }, { onConflict: 'user_id' });

    await saveToVault(
      parsed.data.userId,
      'system-config/system-config.json',
      JSON.stringify(checkpoint.config, null, 2),
      'document',
      {
        allowOverwrite: true,
        originalName: 'system-config.json',
        metadata: { type: 'system-config', restoredAt: nowIso, checkpointId: checkpoint.id }
      }
    );

    await supabase.from('persona_activity').insert({
      user_id: parsed.data.userId,
      action_type: 'system_config_restored',
      summary: `System config restored from checkpoint ${checkpoint.version_label}`,
      details: { checkpointId: checkpoint.id, restoredAt: nowIso },
      requires_attention: false
    });

    return NextResponse.json({ success: true, checkpointId: checkpoint.id, config: checkpoint.config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
