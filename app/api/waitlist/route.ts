import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, type, source } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
    }

    const validTypes = ['author', 'investor'];
    const waitlistType = validTypes.includes(type) ? type : 'author';
    const waitlistSource = source === 'confidential' ? 'confidential' : 'public';

    const { error } = await supabase
      .from('waitlist')
      .upsert(
        { email: email.toLowerCase().trim(), type: waitlistType, source: waitlistSource },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Failed to join waitlist.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
