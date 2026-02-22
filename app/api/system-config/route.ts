import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/types/system-config';
import { getFromVault, saveToVault } from '@/lib/utils/vault';
import { createClient } from '@supabase/supabase-js';

const QuerySchema = z.object({
  userId: z.string().optional()
});

const PatchSchema = z.object({
  userId: z.string().uuid(),
  config: z.record(z.string(), z.unknown())
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
      userId: request.nextUrl.searchParams.get('userId') || undefined
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId } = parsed.data;
    if (!userId) {
      return NextResponse.json({ version: 'default-v1', config: DEFAULT_SYSTEM_CONFIG, source: 'default' });
    }

    const supabase = getSupabase();
    const { data: dbConfig } = await supabase
      .from('system_configs')
      .select('version, config, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbConfig?.config) {
      return NextResponse.json({
        version: dbConfig.version || 'custom',
        config: dbConfig.config,
        source: 'database',
        updatedAt: dbConfig.updated_at
      });
    }

    const raw = await getFromVault(userId, 'system-config/system-config.json');
    if (!raw) {
      return NextResponse.json({ version: 'default-v1', config: DEFAULT_SYSTEM_CONFIG, source: 'default' });
    }

    try {
      const parsedConfig = JSON.parse(raw.toString('utf-8'));
      return NextResponse.json({ version: parsedConfig.version || 'custom', config: parsedConfig, source: 'vault' });
    } catch {
      return NextResponse.json({ version: 'default-v1', config: DEFAULT_SYSTEM_CONFIG, source: 'default' });
    }
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

    const { userId, config } = parsed.data;
    const nowIso = new Date().toISOString();
    const mergedConfig = {
      ...DEFAULT_SYSTEM_CONFIG,
      ...config,
      updatedAt: nowIso
    };

    await saveToVault(
      userId,
      'system-config/system-config.json',
      JSON.stringify(mergedConfig, null, 2),
      'document',
      {
        allowOverwrite: true,
        originalName: 'system-config.json',
        metadata: { type: 'system-config', updatedAt: nowIso }
      }
    );

    const supabase = getSupabase();
    await supabase
      .from('system_config_checkpoints')
      .insert({
        user_id: userId,
        version_label: `${mergedConfig.version || 'custom'}-${nowIso}`,
        config: mergedConfig,
        metadata: {
          source: 'auto_patch'
        }
      });

    await supabase
      .from('system_configs')
      .upsert({
        user_id: userId,
        version: mergedConfig.version || 'custom',
        config: mergedConfig,
        updated_at: nowIso
      }, { onConflict: 'user_id' });

    await saveToVault(
      userId,
      'system-config/SYSTEM.md',
      `# SYSTEM\n\nVersion: ${mergedConfig.version || 'custom'}\nUpdated: ${nowIso}\n`,
      'document',
      {
        allowOverwrite: true,
        originalName: 'SYSTEM.md',
        metadata: { type: 'system-config-human', updatedAt: nowIso }
      }
    );

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'system_config_updated',
      summary: `System config updated (${mergedConfig.version || 'custom'})`,
      details: { updatedAt: nowIso },
      requires_attention: false
    });

    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
