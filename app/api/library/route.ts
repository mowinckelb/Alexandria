import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const userIds = new Set<string>();

    const { data: twins } = await supabase
      .from('twins')
      .select('user_id')
      .limit(200);
    for (const row of twins || []) {
      if (row.user_id) userIds.add(row.user_id);
    }

    const { data: entries } = await supabase
      .from('entries')
      .select('user_id')
      .order('created_at', { ascending: false })
      .limit(500);
    for (const row of entries || []) {
      if (row.user_id) userIds.add(row.user_id);
    }

    const personas: Array<{
      id: string;
      userId: string;
      title: string;
      subtitle: string;
      type: 'natural';
    }> = [...userIds].slice(0, 200).map((id) => ({
      id,
      userId: id,
      title: `Persona ${id.slice(0, 8)}`,
      subtitle: 'Natural persona',
      type: 'natural'
    }));

    return NextResponse.json({ personas, count: personas.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
