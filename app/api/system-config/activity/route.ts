import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional()
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
      userId: request.nextUrl.searchParams.get('userId'),
      limit: request.nextUrl.searchParams.get('limit') || 30
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('persona_activity')
      .select('id, action_type, summary, details, created_at')
      .eq('user_id', parsed.data.userId)
      .or('action_type.eq.system_config_updated,action_type.eq.system_config_restored')
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit || 30);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [], count: (data || []).length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
