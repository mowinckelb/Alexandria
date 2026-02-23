import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from '@/lib/types/system-config';
import { buildMergedSystemConfig, validateSystemConfigAxioms } from '@/lib/system/axioms';

const BodySchema = z.object({
  userId: z.string().uuid().optional(),
  config: z.record(z.string(), z.unknown()).optional()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

async function resolveConfig(userId?: string, inlineConfig?: Record<string, unknown>): Promise<SystemConfig> {
  if (inlineConfig) {
    return buildMergedSystemConfig(inlineConfig);
  }
  if (!userId) {
    return DEFAULT_SYSTEM_CONFIG;
  }

  const supabase = getSupabase();
  const { data: dbConfig } = await supabase
    .from('system_configs')
    .select('config')
    .eq('user_id', userId)
    .maybeSingle();

  if (dbConfig?.config) {
    return buildMergedSystemConfig(dbConfig.config as Record<string, unknown>);
  }

  return DEFAULT_SYSTEM_CONFIG;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, config } = parsed.data;
    const resolvedConfig = await resolveConfig(userId, config);
    const result = validateSystemConfigAxioms(resolvedConfig);

    return NextResponse.json({
      success: result.valid,
      violations: result.violations,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
