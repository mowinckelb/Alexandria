import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid(),
  enabled: z.boolean().optional().default(true)
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

    const { userId, enabled } = parsed.data;
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    if (enabled) {
      // Local-only mode: deactivate all channel bindings for this user.
      const { error: deactivateError } = await supabase
        .from('channel_bindings')
        .update({
          is_active: false,
          paused_until: null,
          updated_at: nowIso
        })
        .eq('user_id', userId)
        .eq('is_active', true);
      if (deactivateError) {
        return NextResponse.json({ error: deactivateError.message }, { status: 500 });
      }
    } else {
      // Channel mode: reactivate previously configured bindings.
      const { error: activateError } = await supabase
        .from('channel_bindings')
        .update({
          is_active: true,
          updated_at: nowIso
        })
        .eq('user_id', userId)
        .eq('is_active', false);
      if (activateError) {
        return NextResponse.json({ error: activateError.message }, { status: 500 });
      }
    }

    const { count: activeBindings } = await supabase
      .from('channel_bindings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: enabled ? 'machine_local_mode_enabled' : 'machine_local_mode_disabled',
      summary: enabled ? 'Enabled local-only machine mode' : 'Disabled local-only mode (channel mode enabled)',
      details: {
        activeBindings: activeBindings || 0
      },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      localOnlyMode: (activeBindings || 0) === 0,
      activeBindings: activeBindings || 0
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
