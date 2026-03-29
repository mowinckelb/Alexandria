import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const { amount } = await req.json();
  const cents = Math.max(500, Math.min(20000, amount * 100));

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
}
