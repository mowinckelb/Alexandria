import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const ReportSchema = z.object({
  reporterUserId: z.string().uuid(),
  personaId: z.string().uuid(),
  reason: z.enum(['abuse', 'impersonation', 'privacy', 'spam', 'other']),
  notes: z.string().max(1200).optional()
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
    const parsed = ReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { reporterUserId, personaId, reason, notes } = parsed.data;
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    const [{ error: ownerLogError }, { error: reporterLogError }] = await Promise.all([
      supabase.from('persona_activity').insert({
        user_id: personaId,
        action_type: 'library_report_received',
        summary: `Library report received (${reason})`,
        details: {
          reason,
          notes: notes || null,
          reporterUserId,
          reportedPersonaId: personaId,
          reportedAt: nowIso,
          moderationStatus: 'pending'
        },
        requires_attention: true
      }),
      supabase.from('persona_activity').insert({
        user_id: reporterUserId,
        action_type: 'library_report_submitted',
        summary: `Submitted Library report (${reason})`,
        details: {
          reason,
          notes: notes || null,
          reportedPersonaId: personaId,
          submittedAt: nowIso
        },
        requires_attention: false
      })
    ]);

    if (ownerLogError) return NextResponse.json({ error: ownerLogError.message }, { status: 500 });
    if (reporterLogError) return NextResponse.json({ error: reporterLogError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
