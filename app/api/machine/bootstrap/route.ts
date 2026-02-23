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

    const [existingTwinRes, existingSystemConfigRes, existingPrivacyRes, existingEditorStateRes] = await Promise.all([
      supabase
        .from('twins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('system_configs')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('privacy_settings')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('editor_state')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    const [twinsInsert, systemConfigInsert, privacyInsert, editorStateInsert] = await Promise.all([
      existingTwinRes.data
        ? Promise.resolve({ error: null as { message?: string } | null, created: false })
        : supabase
            .from('twins')
            .insert({
              user_id: userId,
              status: 'idle'
            })
            .then((res) => ({ error: res.error, created: !res.error })),
      existingSystemConfigRes.data
        ? Promise.resolve({ error: null as { message?: string } | null, created: false })
        : supabase
            .from('system_configs')
            .insert({
              user_id: userId,
              version: config.version,
              config,
              updated_at: nowIso
            })
            .then((res) => ({ error: res.error, created: !res.error })),
      existingPrivacyRes.data
        ? Promise.resolve({ error: null as { message?: string } | null, created: false })
        : supabase
            .from('privacy_settings')
            .insert({
              user_id: userId,
              default_mode: config.privacy.defaultPrivacyLevel,
              contact_modes: {},
              sensitive_sections: [],
              autonomy_level: 'medium',
              updated_at: nowIso
            })
            .then((res) => ({ error: res.error, created: !res.error })),
      existingEditorStateRes.data
        ? Promise.resolve({ error: null as { message?: string } | null, created: false })
        : supabase
            .from('editor_state')
            .insert({
              user_id: userId,
              activity_level: 'medium',
              sleep_duration_minutes: 10,
              next_cycle_at: nowIso,
              cycle_count: 0,
              updated_at: nowIso
            })
            .then((res) => ({ error: res.error, created: !res.error }))
    ]);

    const nonFatalTwinError = twinsInsert.error?.message?.includes('twins_user_id_fkey');
    const bootstrapErrors = [
      !nonFatalTwinError ? twinsInsert.error : null,
      systemConfigInsert.error,
      privacyInsert.error,
      editorStateInsert.error
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

    if (systemConfigInsert.created) {
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
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'machine_bootstrapped',
      summary: 'Machine bootstrap initialized (axioms + blueprint + runtime state)',
      details: {
        configVersion: config.version,
        initializedAt: nowIso,
        created: {
          twins: twinsInsert.created,
          systemConfig: systemConfigInsert.created,
          privacySettings: privacyInsert.created,
          editorState: editorStateInsert.created
        }
      },
      requires_attention: false
    });

    return NextResponse.json({
      success: true,
      userId,
      initializedAt: nowIso,
      configVersion: config.version,
      created: {
        twins: twinsInsert.created,
        systemConfig: systemConfigInsert.created,
        privacySettings: privacyInsert.created,
        editorState: editorStateInsert.created
      },
      warnings: nonFatalTwinError ? ['twins row not created because user is not present in auth users table'] : []
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
