import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const ResolveSchema = z.object({
  userId: z.string().uuid(),
  activityId: z.string().uuid(),
  resolution: z.enum(['dismissed', 'actioned']),
  note: z.string().max(1200).optional()
});

const MODERATION_SLA_WARN_HOURS = Number(process.env.LIBRARY_MODERATION_SLA_WARN_HOURS || '24');
const MODERATION_SLA_CRITICAL_HOURS = Number(process.env.LIBRARY_MODERATION_SLA_CRITICAL_HOURS || '72');

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
      limit: request.nextUrl.searchParams.get('limit') || 50
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('persona_activity')
      .select('id, action_type, summary, details, requires_attention, created_at')
      .eq('user_id', parsed.data.userId)
      .eq('action_type', 'library_report_received')
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit || 50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = data || [];
    const enrichedItems = items.map((row) => {
      const ageHours = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60));
      const severity = !row.requires_attention
        ? 'resolved'
        : ageHours >= MODERATION_SLA_CRITICAL_HOURS
          ? 'critical'
          : ageHours >= MODERATION_SLA_WARN_HOURS
            ? 'warning'
            : 'ok';
      return {
        ...row,
        sla: {
          ageHours: Number(ageHours.toFixed(2)),
          severity
        }
      };
    });

    const pending = enrichedItems.filter((row) => row.requires_attention);
    const pendingCount = pending.length;
    const warningCount = pending.filter((row) => row.sla.severity === 'warning').length;
    const criticalCount = pending.filter((row) => row.sla.severity === 'critical').length;
    const oldestPendingHours = pending.reduce((max, row) => Math.max(max, row.sla.ageHours), 0);

    const alerts = pending
      .filter((row) => row.sla.severity === 'warning' || row.sla.severity === 'critical')
      .slice(0, 25)
      .map((row) => ({
        severity: row.sla.severity,
        message: `${row.summary} unresolved for ${row.sla.ageHours.toFixed(1)}h`,
        activityId: row.id
      }));

    return NextResponse.json({
      items: enrichedItems,
      pendingCount,
      count: enrichedItems.length,
      sla: {
        warnHours: MODERATION_SLA_WARN_HOURS,
        criticalHours: MODERATION_SLA_CRITICAL_HOURS,
        warningCount,
        criticalCount,
        oldestPendingHours: Number(oldestPendingHours.toFixed(2))
      },
      alerts
    });
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
    const parsed = ResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: row, error: rowError } = await supabase
      .from('persona_activity')
      .select('id, user_id, details')
      .eq('id', parsed.data.activityId)
      .eq('user_id', parsed.data.userId)
      .eq('action_type', 'library_report_received')
      .maybeSingle();
    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'Report activity not found' }, { status: 404 });

    const currentDetails = (row.details || {}) as Record<string, unknown>;
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('persona_activity')
      .update({
        requires_attention: false,
        details: {
          ...currentDetails,
          moderationStatus: parsed.data.resolution,
          moderationResolvedAt: nowIso,
          moderationResolvedBy: parsed.data.userId,
          moderationNote: parsed.data.note || null
        }
      })
      .eq('id', row.id)
      .eq('user_id', parsed.data.userId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true, activityId: row.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
