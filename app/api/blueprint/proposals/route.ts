import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { saveToVault } from '@/lib/utils/vault';
import { applySystemConfigPatch, buildMergedSystemConfig, validateSystemConfigAxioms } from '@/lib/system/axioms';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['queued', 'reviewing', 'accepted', 'rejected', 'applied']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const CreateSchema = z.object({
  userId: z.string().uuid(),
  proposalType: z.enum(['config', 'prompt', 'policy', 'code']),
  title: z.string().min(3).max(200),
  rationale: z.string().min(5),
  evidence: z.record(z.string(), z.unknown()).optional(),
  proposal: z.record(z.string(), z.unknown()).optional(),
  impactLevel: z.enum(['low', 'medium', 'high']).optional(),
  source: z.string().min(1).max(50).optional()
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['reviewing', 'accepted', 'rejected', 'applied']),
  reviewNotes: z.string().max(4000).optional(),
  reviewedBy: z.string().max(120).optional()
});

const BulkResolveSchema = z.object({
  action: z.literal('bulk_resolve_high_impact'),
  userId: z.string().uuid(),
  status: z.enum(['reviewing', 'accepted', 'rejected']).optional().default('rejected'),
  reviewNotes: z.string().max(4000).optional().default('bulk-resolved by machine operator'),
  limit: z.number().int().min(1).max(200).optional().default(50)
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function isMissingBlueprintTable(errorMessage?: string): boolean {
  if (!errorMessage) return false;
  return errorMessage.includes("public.blueprint_proposals") || errorMessage.includes('blueprint_proposals');
}

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId'),
      status: request.nextUrl.searchParams.get('status') || undefined,
      limit: request.nextUrl.searchParams.get('limit') || 50
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, status, limit } = parsed.data;
    const supabase = getSupabase();

    let query = supabase
      .from('blueprint_proposals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit || 50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingBlueprintTable(error.message)) {
        return NextResponse.json({
          error: 'Blueprint proposals table not available yet. Apply migration 00033_blueprint_proposals.sql.',
          code: 'BLUEPRINT_TABLE_MISSING'
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
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
    const payload = parsed.data;
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('blueprint_proposals')
      .insert({
        user_id: payload.userId,
        source: payload.source || 'engine',
        proposal_type: payload.proposalType,
        title: payload.title,
        rationale: payload.rationale,
        evidence: payload.evidence || {},
        proposal: payload.proposal || {},
        impact_level: payload.impactLevel || 'medium',
        status: 'queued',
        updated_at: nowIso
      })
      .select('*')
      .single();

    if (error || !data) {
      if (isMissingBlueprintTable(error?.message)) {
        return NextResponse.json({
          error: 'Blueprint proposals table not available yet. Apply migration 00033_blueprint_proposals.sql.',
          code: 'BLUEPRINT_TABLE_MISSING'
        }, { status: 503 });
      }
      return NextResponse.json({ error: error?.message || 'Failed to create proposal' }, { status: 500 });
    }

    await supabase.from('persona_activity').insert({
      user_id: payload.userId,
      action_type: 'blueprint_proposal_created',
      summary: `Blueprint proposal queued: ${payload.title}`,
      details: {
        proposalId: data.id,
        proposalType: payload.proposalType,
        impactLevel: payload.impactLevel || 'medium'
      },
      requires_attention: true
    });

    return NextResponse.json({ success: true, item: data });
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
    if (body?.action === 'bulk_resolve_high_impact') {
      const parsedBulk = BulkResolveSchema.safeParse(body);
      if (!parsedBulk.success) {
        return NextResponse.json({ error: 'Invalid bulk request', details: parsedBulk.error.issues }, { status: 400 });
      }

      const supabase = getSupabase();
      const nowIso = new Date().toISOString();
      const payload = parsedBulk.data;
      const { data: queued, error: queuedError } = await supabase
        .from('blueprint_proposals')
        .select('id')
        .eq('user_id', payload.userId)
        .eq('impact_level', 'high')
        .in('status', ['queued', 'reviewing'])
        .order('created_at', { ascending: true })
        .limit(payload.limit);
      if (queuedError) {
        return NextResponse.json({ error: queuedError.message }, { status: 500 });
      }

      const ids = (queued || []).map((row) => row.id);
      if (ids.length === 0) {
        return NextResponse.json({ success: true, updated: 0 });
      }

      const { error: updateError } = await supabase
        .from('blueprint_proposals')
        .update({
          status: payload.status,
          review_notes: payload.reviewNotes,
          reviewed_by: 'machine-dashboard',
          reviewed_at: nowIso,
          updated_at: nowIso
        })
        .in('id', ids)
        .eq('user_id', payload.userId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await supabase.from('persona_activity').insert({
        user_id: payload.userId,
        action_type: 'blueprint_bulk_resolved',
        summary: `Bulk resolved ${ids.length} high-impact blueprint proposals`,
        details: {
          status: payload.status,
          count: ids.length
        },
        requires_attention: false
      });

      return NextResponse.json({ success: true, updated: ids.length });
    }

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const payload = parsed.data;
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: payload.status,
      updated_at: nowIso
    };
    if (payload.reviewNotes) updatePayload.review_notes = payload.reviewNotes;
    if (payload.reviewedBy) updatePayload.reviewed_by = payload.reviewedBy;
    if (['accepted', 'rejected', 'applied'].includes(payload.status)) {
      updatePayload.reviewed_at = nowIso;
    }
    if (payload.status === 'applied') {
      updatePayload.applied_at = nowIso;
    }

    const { data, error } = await supabase
      .from('blueprint_proposals')
      .update(updatePayload)
      .eq('id', payload.id)
      .eq('user_id', payload.userId)
      .select('*')
      .single();

    if (error || !data) {
      if (isMissingBlueprintTable(error?.message)) {
        return NextResponse.json({
          error: 'Blueprint proposals table not available yet. Apply migration 00033_blueprint_proposals.sql.',
          code: 'BLUEPRINT_TABLE_MISSING'
        }, { status: 503 });
      }
      return NextResponse.json({ error: error?.message || 'Failed to update proposal' }, { status: 500 });
    }

    if (payload.status === 'applied' && data.proposal_type === 'config') {
      const nowIsoApplied = new Date().toISOString();
      const configPatch = ((data.proposal as Record<string, unknown> | null)?.configPatch || {}) as Record<string, unknown>;
      const { data: currentConfigRow } = await supabase
        .from('system_configs')
        .select('config, version')
        .eq('user_id', payload.userId)
        .maybeSingle();
      const currentConfig = (currentConfigRow?.config as Record<string, unknown> | undefined) || {};
      const mergedConfigBase = applySystemConfigPatch(
        buildMergedSystemConfig(currentConfig),
        configPatch
      );
      const mergedConfig = {
        ...mergedConfigBase,
        updatedAt: nowIsoApplied
      };
      const axiomCheck = validateSystemConfigAxioms(mergedConfig);
      if (!axiomCheck.valid) {
        return NextResponse.json({
          error: 'Cannot apply proposal: resulting config violates axioms',
          violations: axiomCheck.violations
        }, { status: 400 });
      }

      const { error: configUpsertError } = await supabase
        .from('system_configs')
        .upsert({
          user_id: payload.userId,
          version: currentConfigRow?.version || 'custom',
          config: mergedConfig,
          updated_at: nowIsoApplied
        }, { onConflict: 'user_id' });
      if (configUpsertError) {
        return NextResponse.json(
          { error: `Failed to apply proposal config: ${configUpsertError.message}` },
          { status: 500 }
        );
      }

      await saveToVault(
        payload.userId,
        'system-config/system-config.json',
        JSON.stringify(mergedConfig, null, 2),
        'document',
        {
          allowOverwrite: true,
          originalName: 'system-config.json',
          metadata: { type: 'system-config', updatedAt: nowIsoApplied, source: 'blueprint_proposal_apply' }
        }
      );
    }

    await supabase.from('persona_activity').insert({
      user_id: payload.userId,
      action_type: 'blueprint_proposal_updated',
      summary: `Blueprint proposal ${payload.status}: ${data.title}`,
      details: {
        proposalId: data.id,
        status: payload.status
      },
      requires_attention: payload.status === 'accepted'
    });

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
