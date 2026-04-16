import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Rate limiting: max 5 requests per IP per minute
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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const amount = typeof body === 'object' && body !== null && 'amount' in body
    ? (body as { amount?: unknown }).amount
    : undefined;
  if (typeof amount !== 'number' || !isFinite(amount) || amount < 5) {
    return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
  }

  const cents = Math.max(500, Math.min(20000, Math.round(amount * 100)));

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product: 'prod_UEw5HOuunvIZU4',
          unit_amount: cents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${req.nextUrl.origin}/patron?success=true`,
      cancel_url: `${req.nextUrl.origin}/patron`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Checkout unavailable.' }, { status: 500 });
  }
}
