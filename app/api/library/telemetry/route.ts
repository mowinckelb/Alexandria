import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const TelemetrySchema = z.object({
  personaId: z.string().uuid(),
  viewerUserId: z.string().uuid().optional(),
  eventType: z.enum(['view', 'interaction']),
  surface: z.enum(['library', 'persona_page', 'api']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
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
    const parsed = TelemetrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { personaId, viewerUserId, eventType, surface, metadata } = parsed.data;
    const supabase = getSupabase();
    const eventAction = eventType === 'view' ? 'library_persona_view' : 'library_persona_interaction';
    const nowIso = new Date().toISOString();

    const { error: ownerLogError } = await supabase.from('persona_activity').insert({
      user_id: personaId,
      action_type: eventAction,
      summary: `Library ${eventType} event`,
      details: {
        personaId,
        viewerUserId: viewerUserId || null,
        surface: surface || 'persona_page',
        metadata: metadata || {},
        at: nowIso
      },
      requires_attention: false
    });
    if (ownerLogError) return NextResponse.json({ error: ownerLogError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
