import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/types/system-config';
import { saveToVault } from '@/lib/utils/vault';
import { validateSystemConfigAxioms } from '@/lib/system/axioms';

const BodySchema = z.object({
  userId: z.string().uuid()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId } = parsed.data;
    const nowIso = new Date().toISOString();
    const supabase = getSupabase();

    const config = {
      ...DEFAULT_SYSTEM_CONFIG,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const axiomCheck = validateSystemConfigAxioms(config);
    if (!axiomCheck.valid) {
      return NextResponse.json({ error: 'Default config violates axioms', violations: axiomCheck.violations }, { status: 500 });
    }

    const [twinsUpsert, systemConfigUpsert, privacyUpsert, editorStateUpsert] = await Promise.all([
      supabase
        .from('twins')
        .upsert({
          user_id: userId,
          status: 'idle'
        }, { onConflict: 'user_id' }),
      supabase
        .from('system_configs')
        .upsert({
          user_id: userId,
          version: config.version,
          config,
          updated_at: nowIso
        }, { onConflict: 'user_id' }),
      supabase
        .from('privacy_settings')
        .upsert({
          user_id: userId,
          default_mode: config.privacy.defaultPrivacyLevel,
          contact_modes: {},
          sensitive_sections: [],
          autonomy_level: 'medium',
          updated_at: nowIso
        }, { onConflict: 'user_id' }),
      supabase
        .from('editor_state')
        .upsert({
          user_id: userId,
          activity_level: 'medium',
          sleep_duration_minutes: 10,
          next_cycle_at: nowIso,
          cycle_count: 0,
          updated_at: nowIso
        }, { onConflict: 'user_id' })
    ]);
    const nonFatalTwinError = twinsUpsert.error?.message?.includes('twins_user_id_fkey');
    const bootstrapErrors = [
      !nonFatalTwinError ? twinsUpsert.error : null,
      systemConfigUpsert.error,
      privacyUpsert.error,
      editorStateUpsert.error
    ].filter(Boolean);
    if (bootstrapErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Failed to bootstrap machine tables',
          details: bootstrapErrors.map((err) => (err as { message?: string }).message || 'Unknown error')
        },
        { status: 500 }
      );
    }

    await saveToVault(
      userId,
      'system-config/system-config.json',
      JSON.stringify(config, null, 2),
      'document',
      {
        allowOverwrite: true,
        originalName: 'system-config.json',
        metadata: { type: 'system-config', initializedAt: nowIso }
      }
    );

    await saveToVault(
      userId,
      'system-config/SYSTEM.md',
      `# SYSTEM\n\nVersion: ${config.version}\nInitialized: ${nowIso}\n`,
      'document',
      {
        allowOverwrite: true,
        originalName: 'SYSTEM.md',
        metadata: { type: 'system-config-human', initializedAt: nowIso }
      }
    );

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'machine_bootstrapped',
      summary: 'Machine bootstrap initialized (axioms + blueprint + runtime state)',
      details: {
        configVersion: config.version,
        initializedAt: nowIso
      },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      userId,
      initializedAt: nowIso,
      configVersion: config.version,
      warnings: nonFatalTwinError ? ['twins row not created because user is not present in auth users table'] : []
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
