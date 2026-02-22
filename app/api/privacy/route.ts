import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid()
});

const PatchSchema = z.object({
  userId: z.string().uuid(),
  defaultMode: z.enum(['private', 'personal', 'professional']).optional(),
  contactModes: z.record(z.string(), z.enum(['private', 'personal', 'professional'])).optional(),
  sensitiveSections: z.array(z.string()).optional(),
  autonomyLevel: z.enum(['low', 'medium', 'high']).optional()
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
      userId: request.nextUrl.searchParams.get('userId')
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId } = parsed.data;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Return defaults when user has no row yet.
      return NextResponse.json({
        userId,
        defaultMode: 'personal',
        contactModes: {},
        sensitiveSections: [],
        autonomyLevel: 'medium'
      });
    }

    return NextResponse.json({
      userId: data.user_id,
      defaultMode: data.default_mode,
      contactModes: data.contact_modes || {},
      sensitiveSections: data.sensitive_sections || [],
      autonomyLevel: data.autonomy_level,
      updatedAt: data.updated_at
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, defaultMode, contactModes, sensitiveSections, autonomyLevel } = parsed.data;
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const update = {
      user_id: userId,
      default_mode: defaultMode ?? existing?.default_mode ?? 'personal',
      contact_modes: contactModes ?? existing?.contact_modes ?? {},
      sensitive_sections: sensitiveSections ?? existing?.sensitive_sections ?? [],
      autonomy_level: autonomyLevel ?? existing?.autonomy_level ?? 'medium',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('privacy_settings')
      .upsert(update, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'privacy_settings_updated',
      summary: `Updated privacy mode to ${data.default_mode} and autonomy to ${data.autonomy_level}`,
      details: {
        defaultMode: data.default_mode,
        autonomyLevel: data.autonomy_level
      },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      userId: data.user_id,
      defaultMode: data.default_mode,
      contactModes: data.contact_modes || {},
      sensitiveSections: data.sensitive_sections || [],
      autonomyLevel: data.autonomy_level,
      updatedAt: data.updated_at
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
