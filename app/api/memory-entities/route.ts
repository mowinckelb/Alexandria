import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

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
      limit: request.nextUrl.searchParams.get('limit') || 50
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('memory_entities')
      .select('entity_name, entity_type')
      .eq('user_id', parsed.data.userId)
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit || 50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const buckets = new Map<string, { entityName: string; entityType: string; count: number }>();
    for (const row of data || []) {
      const key = `${row.entity_name.toLowerCase()}::${row.entity_type}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        buckets.set(key, {
          entityName: row.entity_name,
          entityType: row.entity_type,
          count: 1
        });
      }
    }

    const items = [...buckets.values()].sort((a, b) => b.count - a.count);
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
