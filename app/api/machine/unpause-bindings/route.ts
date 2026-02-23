import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid(),
  onlyAutoPaused: z.boolean().optional().default(true)
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, onlyAutoPaused } = parsed.data;
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    const { data: rows, error: fetchError } = await supabase
      .from('channel_bindings')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('paused_until', nowIso)
      .limit(200);
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    const targets = (rows || []).filter((row) => {
      if (!onlyAutoPaused) return true;
      return Boolean((row.metadata as Record<string, unknown> | null)?.autoPaused);
    });

    for (const row of targets) {
      const metadata = ((row.metadata as Record<string, unknown>) || {});
      await supabase
        .from('channel_bindings')
        .update({
          paused_until: null,
          metadata: {
            ...metadata,
            autoPaused: false,
            unpausedAt: nowIso,
            unpauseSource: 'machine'
          },
          updated_at: nowIso
        })
        .eq('id', row.id);
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'machine_unpause_bindings',
      summary: `Unpaused ${targets.length} channel bindings`,
      details: { onlyAutoPaused, count: targets.length },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      unpaused: targets.length,
      onlyAutoPaused
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
