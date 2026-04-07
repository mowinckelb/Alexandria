/**
 * Billing — Stripe subscription management + Library payment
 *
 * Subscription: $10/mo, or free with 5+ active kin. Binary. Slider open above floor.
 * Library: monthly tab billing (micro-transactions settled monthly via Stripe Billing Meters).
 * Non-Author: instant payment via Stripe Checkout.
 * Free during beta — billing infra is ready but not gating.
 */

import Stripe from 'stripe';
import type { Hono } from 'hono';
import { logEvent } from './analytics.js';
import { callbackPageHtml } from './templates.js';
import { extractApiKey, findByApiKey } from './prosumer.js';

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
// Price ID — one price, $10/month. Free with 5+ active kin (coupon).
// ---------------------------------------------------------------------------

const KIN_THRESHOLD = parseInt(process.env.KIN_THRESHOLD || '5', 10);

let _priceId: string | null = null;
let _couponId: string | null = null;

async function ensurePrice(): Promise<string> {
  if (_priceId) return _priceId;

  const stripe = getStripe();
  const products = await stripe.products.list({ limit: 10 });
  let product = products.data.find(p => p.metadata.alexandria === 'examined_life');

  if (!product) {
    product = await stripe.products.create({
      name: 'The Examined Life',
      description: 'Alexandria — Greek philosophy infrastructure. One tier, everything included.',
      metadata: { alexandria: 'examined_life' },
    });
  }

  const prices = await stripe.prices.list({ product: product.id, limit: 10 });
  let price = prices.data.find(p => p.metadata.tier === 'standard' && p.active);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1000,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: 'standard' },
    });
  }

  _priceId = price.id;
  return _priceId;
}

async function ensureKinCoupon(): Promise<string> {
  if (_couponId) return _couponId;

  const stripe = getStripe();
  const coupons = await stripe.coupons.list({ limit: 20 });
  let coupon = coupons.data.find(c => c.metadata?.alexandria === 'kin_free' && c.valid);

  if (!coupon) {
    coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: 'forever',
      name: 'Active Kin — Free',
      metadata: { alexandria: 'kin_free' },
    });
  }

  _couponId = coupon.id;
  return _couponId;
}

// ---------------------------------------------------------------------------
// Kin — count active kin for a user, recalculate subscription
// ---------------------------------------------------------------------------

export async function countActiveKin(apiKey: string): Promise<number> {
  const user = await findByApiKey(apiKey);
  if (!user?.github_login) return 0;

  // Find who this user referred (from D1 referrals table)
  const { getDB } = await import('./db.js');
  const db = getDB();
  const { results } = await db.prepare(
    `SELECT referred_github_login FROM referrals WHERE author_id = ?`
  ).bind(user.github_login).all<{ referred_github_login: string }>();

  if (!results || results.length === 0) return 0;

  // Kin must be paying subscribers — unfakeable via burner accounts
  const { loadAccounts } = await import('./kv.js');
  const accounts = await loadAccounts<Record<string, any>>();
  let active = 0;

  for (const row of results) {
    const kinAccount = Object.values(accounts).find((a: any) => a.github_login === row.referred_github_login);
    if (kinAccount && (kinAccount as any).subscription_id) active++;
  }

  return active;
}

export async function recalculateKinPricing(apiKey: string): Promise<void> {
  const user = await findByApiKey(apiKey);
  if (!user?.subscription_id) return;

  const activeKin = await countActiveKin(apiKey);
  const shouldBeFree = activeKin >= KIN_THRESHOLD;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(user.subscription_id);

  const hasKinDiscount = sub.discounts?.some(d => {
    if (typeof d === 'string') return false;
    const coupon = d.source?.coupon;
    return typeof coupon !== 'string' && coupon?.metadata?.alexandria === 'kin_free';
  });

  if (shouldBeFree && !hasKinDiscount) {
    const couponId = await ensureKinCoupon();
    await stripe.subscriptions.update(user.subscription_id, { discounts: [{ coupon: couponId }] });
    logEvent('kin_pricing_free', { api_key: apiKey, active_kin: String(activeKin) });
  } else if (!shouldBeFree && hasKinDiscount) {
    await stripe.subscriptions.deleteDiscount(user.subscription_id);
    logEvent('kin_pricing_paid', { api_key: apiKey, active_kin: String(activeKin) });
  }
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

  const priceId = await ensurePrice();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
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

  // Portal — requires API key auth, uses account's own Stripe customer ID
  app.post('/billing/portal', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);
    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);
    if (!account.stripe_customer_id) return c.json({ error: 'No billing account' }, 400);

    try {
      const url = await createPortalSession(account.stripe_customer_id);
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
      if (!WEBHOOK_SECRET || !sig) {
        console.error('Webhook rejected — STRIPE_WEBHOOK_SECRET or signature missing');
        return c.text('Webhook not configured', 500);
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.text('Invalid signature', 400);
    }

    // Idempotency — skip already-processed events
    try {
      const { getKV } = await import('./kv.js');
      const kv = getKV();
      const eventKey = `stripe:event:${event.id}`;
      const alreadyProcessed = await kv.get(eventKey);
      if (alreadyProcessed) {
        return c.json({ received: true, deduplicated: true });
      }
      await kv.put(eventKey, '1', { expirationTtl: 86400 }); // 24h TTL
    } catch {
      // KV failure — proceed but log
      console.warn('[billing] Event dedup check failed, proceeding anyway');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          // Library one-time purchase (non-Author)
          if (session.metadata?.library_purchase === 'true') {
            const amountCents = session.amount_total || 0;
            const authorId = session.metadata?.author_id || '';
            const artifactType = session.metadata?.artifact_type || 'shadow';
            const cutRate = parseFloat(process.env.LIBRARY_CUT_PERCENT || '50') / 100;
            const alexandriaCut = Math.round(amountCents * cutRate);
            const authorCut = amountCents - alexandriaCut;

            try {
              const { getDB } = await import('./db.js');
              const db = getDB();
              await db.prepare(
                `INSERT INTO billing_tab (accessor_id, author_id, artifact_type, amount_cents, alexandria_cut_cents, author_cut_cents, month, settled, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
              ).bind(
                session.customer_email || 'anonymous',
                authorId, artifactType, amountCents, alexandriaCut, authorCut,
                new Date().toISOString().slice(0, 7),
                new Date().toISOString()
              ).run();
            } catch (e) {
              console.error('[billing] Library purchase tab entry failed:', e);
            }

            // Store access grant in KV (TTL 30 days)
            // Access keyed by session ID so the success redirect can serve content
            try {
              const { getKV } = await import('./kv.js');
              const kv = getKV();
              await kv.put(`library:access:${session.id}`, JSON.stringify({
                author_id: authorId,
                artifact_type: artifactType,
                artifact_id: session.metadata?.artifact_id || '',
                granted_at: new Date().toISOString(),
              }), { expirationTtl: 30 * 24 * 60 * 60 });
            } catch (e) {
              console.error('[billing] Library access grant failed:', e);
            }

            logEvent('library_purchase', { author: authorId, artifact_type: artifactType, amount_cents: String(amountCents) });
            break;
          }

          // Regular subscription checkout
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

        case 'invoice.upcoming': {
          // Recalculate kin pricing ~3 days before billing
          const invoice = event.data.object as Stripe.Invoice;
          const subDetails = invoice.parent?.subscription_details;
          const subId = typeof subDetails?.subscription === 'string'
            ? subDetails.subscription
            : subDetails?.subscription?.id
              || (typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : null);
          if (subId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subId);
              const apiKey = sub.metadata?.api_key;
              if (apiKey) {
                await recalculateKinPricing(apiKey);
              }
            } catch (e) {
              console.error('[billing] Kin recalculation failed:', e);
            }
          }
          break;
        }

        case 'invoice.paid': {
          // Send kin nudge receipt after each billing cycle
          const invoice = event.data.object as Stripe.Invoice;
          // Skip Library purchases and non-subscription invoices
          if (invoice.metadata?.library_purchase === 'true') break;
          const subDetails = invoice.parent?.subscription_details;
          const subId = typeof subDetails?.subscription === 'string'
            ? subDetails.subscription
            : subDetails?.subscription?.id
              || (typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : null);
          if (subId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subId);
              const apiKey = sub.metadata?.api_key;
              if (apiKey) {
                const user = await findByApiKey(apiKey);
                if (user?.email) {
                  const activeKin = await countActiveKin(apiKey);
                  const amountPaid = (invoice.amount_paid || 0) / 100;
                  const kinNeeded = Math.max(0, KIN_THRESHOLD - activeKin);
                  await sendKinReceiptEmail(user.email, user.github_login, amountPaid, activeKin, kinNeeded);
                  logEvent('kin_receipt_sent', { api_key: apiKey, active_kin: String(activeKin), amount: String(amountPaid) });
                }
              }
            } catch (e) {
              console.error('[billing] Kin receipt email failed:', e);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subDetails = invoice.parent?.subscription_details;
          const subId = typeof subDetails?.subscription === 'string'
            ? subDetails.subscription
            : subDetails?.subscription?.id;
          let paymentFailHandled = false;
          if (subId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subId);
              const apiKey = sub.metadata?.api_key;
              if (apiKey) {
                await onAccountUpdate(apiKey, { subscription_status: 'past_due' });
                paymentFailHandled = true;
              }
            } catch (subErr) {
              console.error('[billing] Subscription lookup failed during payment_failed:', subErr);
            }
          }
          if (!paymentFailHandled) {
            console.error(`[billing] Payment failed but could not update account — customer: ${invoice.customer}, sub: ${subId || 'unknown'}`);
          }
          logEvent('billing_payment_failed', {
            customer: invoice.customer as string,
            handled: paymentFailHandled ? 'true' : 'false',
          });
          break;
        }
      }
    } catch (err) {
      console.error('Webhook handler error:', err);
      return c.text('Webhook handler failed', 500);
    }

    return c.json({ received: true });
  });
}

// ---------------------------------------------------------------------------
// Library — one-time checkout for non-Authors
// ---------------------------------------------------------------------------

export async function createLibraryCheckoutWithSlider(opts: {
  authorId: string;
  authorDisplayName: string;
  artifactType: string;
  artifactId: string;
  minCents: number;
}): Promise<string> {
  const stripe = getStripe();
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${opts.authorDisplayName} — ${opts.artifactType}`,
        },
        unit_amount: opts.minCents,
      },
      quantity: 1,
    }],
    metadata: {
      library_purchase: 'true',
      author_id: opts.authorId,
      artifact_type: opts.artifactType,
      artifact_id: opts.artifactId,
    },
    success_url: `${WEBSITE_URL}/library/${opts.authorId}?access=granted&session_id={CHECKOUT_SESSION_ID}&artifact_type=${opts.artifactType}&artifact_id=${opts.artifactId}`,
    cancel_url: `${WEBSITE_URL}/library/${opts.authorId}`,
  });
  return session.url || '';
}

export async function createLibraryCheckout(opts: {
  authorId: string;
  authorDisplayName: string;
  artifactType: string;
  artifactId: string;
  priceCents: number;
}): Promise<string> {
  const stripe = getStripe();
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${opts.authorDisplayName}'s Shadow — Paid Tier`,
          metadata: { author_id: opts.authorId, artifact_type: opts.artifactType },
        },
        unit_amount: opts.priceCents,
      },
      quantity: 1,
    }],
    metadata: {
      library_purchase: 'true',
      author_id: opts.authorId,
      artifact_type: opts.artifactType,
      artifact_id: opts.artifactId,
    },
    success_url: `${WEBSITE_URL}/library/${opts.authorId}?access=granted&session_id={CHECKOUT_SESSION_ID}&artifact_type=${opts.artifactType}&artifact_id=${opts.artifactId}`,
    cancel_url: `${WEBSITE_URL}/library/${opts.authorId}`,
  });
  return session.url || '';
}

// ---------------------------------------------------------------------------
// Library — monthly tab settlement (called from cron)
// ---------------------------------------------------------------------------

export async function settleMonthlyTabs(): Promise<void> {
  try {
    const { getDB } = await import('./db.js');
    const db = getDB();

    // Settle previous month
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const { results } = await db.prepare(
      `SELECT accessor_id, SUM(amount_cents) as total_cents
       FROM billing_tab WHERE month = ? AND settled = 0
       GROUP BY accessor_id`
    ).bind(lastMonth).all<{ accessor_id: string; total_cents: number }>();

    if (!results || results.length === 0) return;

    // For each accessor, look up their Stripe customer ID and report usage
    const { loadAccounts } = await import('./kv.js');
    const accounts = await loadAccounts<Record<string, any>>();

    for (const tab of results) {
      // Find account by github_login
      const account = Object.values(accounts).find((a: any) => a.github_login === tab.accessor_id);
      if (!account || !(account as any).stripe_customer_id) {
        console.warn(`[billing] Cannot settle tab for ${tab.accessor_id} — no Stripe customer`);
        continue;
      }

      try {
        // Create an invoice item on their next invoice
        const stripe = getStripe();
        await stripe.invoiceItems.create({
          customer: (account as any).stripe_customer_id,
          amount: tab.total_cents,
          currency: 'usd',
          description: `Library access — ${lastMonth}`,
        });

        // Mark as settled
        await db.prepare(
          `UPDATE billing_tab SET settled = 1 WHERE accessor_id = ? AND month = ? AND settled = 0`
        ).bind(tab.accessor_id, lastMonth).run();

        logEvent('billing_tab_settled', { accessor: tab.accessor_id, month: lastMonth, amount_cents: String(tab.total_cents) });
      } catch (e) {
        console.error(`[billing] Settlement failed for ${tab.accessor_id}:`, e);
      }
    }
  } catch (e) {
    console.error('[billing] settleMonthlyTabs error:', e);
  }
}

// ---------------------------------------------------------------------------
// Kin receipt email — sent after each billing cycle
// ---------------------------------------------------------------------------

async function sendKinReceiptEmail(
  email: string,
  githubLogin: string,
  amountPaid: number,
  activeKin: number,
  kinNeeded: number,
): Promise<void> {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  const kinLink = `${WEBSITE_URL}/signup?ref=${encodeURIComponent(githubLogin)}`;

  const kinLine = kinNeeded === 0
    ? `<p style="font-size: 1rem; color: #3d3630; margin: 0;">you have ${activeKin} active kin. alexandria is free.</p>`
    : `<p style="font-size: 1rem; color: #3d3630; margin: 0;">you have ${activeKin} active kin. ${kinNeeded} more and it&rsquo;s free.</p>`;

  const amountLine = amountPaid === 0
    ? `<p style="font-size: 1.15rem; color: #3d3630; margin: 0 0 1.5rem;">$0 this month.</p>`
    : `<p style="font-size: 1.15rem; color: #3d3630; margin: 0 0 1.5rem;">$${amountPaid.toFixed(0)} this month.</p>`;

  const html = `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  ${amountLine}
  ${kinLine}
  <p style="font-size: 0.85rem; color: #8a8078; margin: 1.5rem 0 0;"><a href="${kinLink}" style="color: #8a8078;">your kin link</a></p>
  <p style="font-size: 0.78rem; color: #bbb4aa; margin-top: 2rem;">the examined life.</p>
</div>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Alexandria <a@mowinckel.ai>',
        to: email,
        subject: amountPaid === 0 ? 'alexandria. — free this month' : `alexandria. — $${amountPaid.toFixed(0)} this month`,
        html,
      }),
    });
    if (!resp.ok) {
      console.error('[billing] Receipt email Resend error:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('[billing] Receipt email send failed:', err);
  }
}
