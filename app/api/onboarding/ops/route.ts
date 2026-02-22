import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const QuerySchema = z.object({
  userId: z.string().uuid()
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

    const userId = parsed.data.userId;
    const supabase = getSupabase();

    const [entriesRes, constitutionRes, activeConstitutionRes, maturityRes, keysRes, bindingsRes, editorStateRes] = await Promise.all([
      supabase.from('entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('constitutions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('active_constitutions').select('constitution_id').eq('user_id', userId).maybeSingle(),
      supabase.from('plm_maturity').select('overall_score, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('channel_bindings').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
      supabase.from('editor_state').select('last_contact_at, metadata').eq('user_id', userId).maybeSingle()
    ]);

    if (entriesRes.error) return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });
    if (constitutionRes.error) return NextResponse.json({ error: constitutionRes.error.message }, { status: 500 });
    if (activeConstitutionRes.error) return NextResponse.json({ error: activeConstitutionRes.error.message }, { status: 500 });
    if (maturityRes.error) return NextResponse.json({ error: maturityRes.error.message }, { status: 500 });
    if (keysRes.error) return NextResponse.json({ error: keysRes.error.message }, { status: 500 });
    if (bindingsRes.error) return NextResponse.json({ error: bindingsRes.error.message }, { status: 500 });
    if (editorStateRes.error) return NextResponse.json({ error: editorStateRes.error.message }, { status: 500 });

    const counts = {
      entries: entriesRes.count || 0,
      constitutions: constitutionRes.count || 0,
      activeBindings: bindingsRes.count || 0,
      apiKeys: keysRes.count || 0
    };

    const maturity = maturityRes.data?.overall_score ?? null;
    const hasActiveConstitution = Boolean(activeConstitutionRes.data?.constitution_id);
    const hasEditorContact = Boolean(editorStateRes.data?.last_contact_at);

    const checklist = {
      dataIngested: counts.entries >= 10,
      constitutionExtracted: hasActiveConstitution || counts.constitutions > 0,
      orchestratorMatureEnough: maturity !== null && maturity >= 0.35,
      externalAccessReady: counts.apiKeys > 0,
      bridgeReady: counts.activeBindings > 0,
      editorLoopSeen: hasEditorContact
    };

    const blockers = Object.entries(checklist)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    const recommendations: string[] = [];
    if (!checklist.dataIngested) recommendations.push('Ingest more source data (voice/files) to improve extraction fidelity.');
    if (!checklist.constitutionExtracted) recommendations.push('Run Constitution extraction and set an active Constitution.');
    if (!checklist.orchestratorMatureEnough) recommendations.push('Generate/review more RLAIF pairs to raise PLM maturity.');
    if (!checklist.externalAccessReady) recommendations.push('Create at least one API key for external access testing.');
    if (!checklist.bridgeReady) recommendations.push('Create and activate at least one channel binding.');
    if (!checklist.editorLoopSeen) recommendations.push('Run editor cycle or send input to initialize last contact state.');

    return NextResponse.json({
      counts,
      checklist,
      blockers,
      recommendations,
      details: {
        maturity,
        maturityUpdatedAt: maturityRes.data?.updated_at || null,
        lastEditorContactAt: editorStateRes.data?.last_contact_at || null
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
