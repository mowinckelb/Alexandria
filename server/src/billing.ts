/**
 * Billing — Stripe subscription management
 *
 * Two prices: $5/mo (with 3+ active kin) and $10/mo (without).
 * Free during beta — billing infra is ready but not gating.
 */

import Stripe from 'stripe';
import type { Hono } from 'hono';
import { logEvent } from './analytics.js';
import { callbackPageHtml } from './templates.js';

// ---------------------------------------------------------------------------
// Stripe client — lazy init (needs env to be populated)
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Price IDs — resolved lazily on first use
// ---------------------------------------------------------------------------

let priceWithKin: string | null = null;
let priceWithoutKin: string | null = null;

async function ensurePrices(): Promise<{ withKin: string; withoutKin: string }> {
  if (priceWithKin && priceWithoutKin) {
    return { withKin: priceWithKin, withoutKin: priceWithoutKin };
  }

  const stripe = getStripe();
  const products = await stripe.products.list({ limit: 10 });
  let product = products.data.find(p => p.metadata.alexandria === 'examined_life');

  if (!product) {
    product = await stripe.products.create({
      name: 'The Examined Life',
      description: 'Alexandria — sovereign cognitive transformation layer. One tier, everything included.',
      metadata: { alexandria: 'examined_life' },
    });
  }

  const prices = await stripe.prices.list({ product: product.id, limit: 10 });
  let kin = prices.data.find(p => p.metadata.tier === 'with_kin' && p.active);
  let noKin = prices.data.find(p => p.metadata.tier === 'without_kin' && p.active);

  if (!kin) {
    kin = await stripe.prices.create({
      product: product.id,
      unit_amount: 500,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: 'with_kin' },
    });
  }

  if (!noKin) {
    noKin = await stripe.prices.create({
      product: product.id,
      unit_amount: 1000,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: 'without_kin' },
    });
  }

  priceWithKin = kin.id;
  priceWithoutKin = noKin.id;
  return { withKin: priceWithKin, withoutKin: priceWithoutKin };
}

// ---------------------------------------------------------------------------
// Billing types
// ---------------------------------------------------------------------------

export interface BillingInfo {
  stripe_customer_id?: string;
  subscription_status?: string;
  subscription_id?: string;
  current_period_end?: string;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function createCheckoutSession(opts: {
  email: string;
  githubLogin: string;
  apiKey: string;
  stripeCustomerId?: string;
}): Promise<string> {
  const stripe = getStripe();
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  const BETA = process.env.BETA_MODE !== 'false';

  const customer = opts.stripeCustomerId
    ? { customer: opts.stripeCustomerId }
    : { customer_email: opts.email };

  if (BETA) {
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'usd',
      ...customer,
      metadata: {
        github_login: opts.githubLogin,
        api_key: opts.apiKey,
      },
      custom_text: {
        submit: { message: 'free in beta. we\'ll let you know before billing starts.' },
      },
      success_url: `${SERVER_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEBSITE_URL}/signup?billing=cancel`,
    });
    return session.url || '';
  }

  const prices = await ensurePrices();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: prices.withKin, quantity: 1 }],
    ...customer,
    subscription_data: {
      description: 'the examined life',
      metadata: { api_key: opts.apiKey, github_login: opts.githubLogin },
    },
    metadata: {
      github_login: opts.githubLogin,
      api_key: opts.apiKey,
    },
    success_url: `${SERVER_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBSITE_URL}/signup?billing=cancel`,
  });

  return session.url || '';
}

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

export async function createPortalSession(stripeCustomerId: string): Promise<string> {
  const stripe = getStripe();
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${WEBSITE_URL}/signup`,
  });
  return session.url;
}

// ---------------------------------------------------------------------------
// Billing routes
// ---------------------------------------------------------------------------

export type AccountUpdater = (apiKey: string, billing: Partial<BillingInfo>) => Promise<void>;

export function registerBillingRoutes(app: Hono, onAccountUpdate: AccountUpdater) {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  // Success page
  app.get('/billing/success', async (c) => {
    const sessionId = c.req.query('session_id');
    if (!sessionId) {
      return c.redirect(`${WEBSITE_URL}/signup`);
    }

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const login = session.metadata?.github_login || '';
      const apiKey = session.metadata?.api_key || '';

      if (!apiKey) {
        return c.redirect(`${WEBSITE_URL}/signup`);
      }

      let customerId = session.customer as string | null;
      if (!customerId && session.setup_intent) {
        try {
          const intentId = typeof session.setup_intent === 'string'
            ? session.setup_intent : session.setup_intent;
          const intent = await stripe.setupIntents.retrieve(intentId as string);
          customerId = intent.customer as string | null;
        } catch { /* proceed without customer ID */ }
      }

      const billingUpdate: Partial<BillingInfo> = {
        ...(customerId ? { stripe_customer_id: customerId } : {}),
        ...(session.subscription
          ? { subscription_id: session.subscription as string, subscription_status: 'active' }
          : { subscription_status: 'beta' }),
      };
      await onAccountUpdate(apiKey, billingUpdate);
      logEvent('billing_checkout_completed', { mode: session.mode || 'unknown' });

      return c.html(callbackPageHtml(login, apiKey));
    } catch (err) {
      console.error('Billing success page error:', err);
      return c.redirect(`${WEBSITE_URL}/signup`);
    }
  });

  // Portal
  app.post('/billing/portal', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { stripe_customer_id } = body;

    if (!stripe_customer_id) {
      return c.json({ error: 'No Stripe customer ID' }, 400);
    }

    try {
      const url = await createPortalSession(stripe_customer_id);
      return c.json({ url });
    } catch (err) {
      console.error('Portal error:', err);
      return c.json({ error: 'Failed to create portal session' }, 500);
    }
  });

  // Webhook — raw body for signature verification
  app.post('/billing/webhook', async (c) => {
    const stripe = getStripe();
    const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
    const sig = c.req.header('stripe-signature') || '';

    // Get raw body for signature verification
    const rawBody = await c.req.text();

    let event: Stripe.Event;
    try {
      if (WEBHOOK_SECRET && sig) {
        event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
      } else {
        console.warn('STRIPE_WEBHOOK_SECRET not set — accepting webhook without verification');
        event = JSON.parse(rawBody) as Stripe.Event;
      }
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.text('Invalid signature', 400);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const apiKey = session.metadata?.api_key;
          if (apiKey && session.customer && session.subscription) {
            await onAccountUpdate(apiKey, {
              stripe_customer_id: session.customer as string,
              subscription_id: session.subscription as string,
              subscription_status: 'active',
            });
            logEvent('billing_subscription_created', {
              github_login: session.metadata?.github_login || '',
            });
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          const apiKey = sub.metadata?.api_key;
          if (apiKey) {
            const periodEnd = sub.items?.data?.[0]?.current_period_end;
            await onAccountUpdate(apiKey, {
              subscription_status: sub.status,
              ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
            });
          }
          logEvent('billing_subscription_updated', {
            status: sub.status,
            customer: customerId,
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const apiKey = sub.metadata?.api_key;
          if (apiKey) {
            await onAccountUpdate(apiKey, { subscription_status: 'canceled' });
          }
          logEvent('billing_subscription_canceled', {
            customer: sub.customer as string,
          });
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subDetails = invoice.parent?.subscription_details;
          const subId = typeof subDetails?.subscription === 'string'
            ? subDetails.subscription
            : subDetails?.subscription?.id;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            const apiKey = sub.metadata?.api_key;
            if (apiKey) {
              await onAccountUpdate(apiKey, { subscription_status: 'past_due' });
            }
          }
          logEvent('billing_payment_failed', {
            customer: invoice.customer as string,
          });
          break;
        }
      }
    } catch (err) {
      console.error('Webhook handler error:', err);
    }

    return c.json({ received: true });
  });
}
