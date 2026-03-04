import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Simple in-memory rate limiting: max 5 requests per IP per minute
const rateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const { email, type, source } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
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
