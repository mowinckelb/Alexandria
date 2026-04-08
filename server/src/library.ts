/**
 * Library — Turn 3 (Show)
 *
 * Published artifacts: shadows, pulses, quizzes, works.
 * Constitution never touches these servers. Only curated fragments the Author chose to publish.
 * Universal data silo: any app can read the shadow API to personalise services for the Author.
 */

import { Hono } from 'hono';
import { getDB, getR2, generateId, currentMonth } from './db.js';
import { logEvent } from './analytics.js';

import { extractApiKey, findByApiKey } from './prosumer.js';

// ---------------------------------------------------------------------------
// CORS-safe R2 response (Hono middleware headers don't carry through new Response)
// ---------------------------------------------------------------------------

function r2Response(body: ReadableStream | null, contentType: string, reqOrigin?: string | null, cache?: string): Response {
  const websiteUrl = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  const allowed = [websiteUrl, websiteUrl.replace('https://', 'https://www.'), 'http://localhost:3000'];
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Vary': 'Origin',
  };
  if (reqOrigin && allowed.includes(reqOrigin)) {
    headers['Access-Control-Allow-Origin'] = reqOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }
  if (cache) headers['Cache-Control'] = cache;
  return new Response(body, { headers });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/** Validate authorId is a safe GitHub username (alphanumeric + hyphens, no path traversal) */
function isValidAuthorId(id: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(id) && id.length <= 39;
}

// ---------------------------------------------------------------------------
// Access logging
// ---------------------------------------------------------------------------

async function recordAccess(event: string, authorId: string, accessorId: string | null, artifactId: string | null, tier: string | null): Promise<void> {
  try {
    const db = getDB();
    await db.prepare(
      `INSERT INTO access_log (event, author_id, accessor_id, artifact_id, tier, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(event, authorId, accessorId, artifactId, tier, new Date().toISOString()).run();
  } catch (e) {
    console.error('[library] access_log write failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerLibraryRoutes(app: Hono): void {

  // Validate :author param on all routes (prevent path traversal in R2 keys)
  const validateAuthor = async (c: any, next: any) => {
    const authorId = c.req.param('author');
    if (authorId && !isValidAuthorId(authorId)) {
      return c.json({ error: 'Invalid author ID' }, 400);
    }
    await next();
  };
  app.use('/library/:author/*', validateAuthor);
  app.use('/library/:author', validateAuthor);

  // =========================================================================
  // PUBLISHING (Author-authenticated)
  // =========================================================================

  // Publish or update shadow (free and/or paid tier)
  app.post('/library/publish/shadow', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);

    const body = await c.req.json().catch(() => null);
    if (!body || (!body.free_shadow && !body.paid_shadow)) {
      return c.json({ error: 'Provide free_shadow and/or paid_shadow' }, 400);
    }

    const db = getDB();
    const r2 = getR2();

    // Resolve author from KV accounts (reuse existing account system)
    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const authorId = account.github_login;
    const now = new Date().toISOString();

    // Upsert author
    await db.prepare(
      `INSERT INTO authors (id, display_name, published_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET updated_at = ?`
    ).bind(authorId, body.display_name || authorId, now, now, now).run();

    // Store shadows in R2 and upsert metadata (delete + insert — one shadow per author+tier)
    for (const tier of ['free', 'paid'] as const) {
      const content = tier === 'free' ? body.free_shadow : body.paid_shadow;
      if (!content) continue;

      // Size limit — 10MB max per shadow
      if (typeof content === 'string' && content.length > 10 * 1024 * 1024) {
        return c.json({ error: `Shadow content too large (${tier}). Max 10MB.` }, 413);
      }

      const r2Key = `shadows/${authorId}/${tier}.md`;
      await r2.put(r2Key, content as string);
      await db.prepare(`DELETE FROM shadows WHERE author_id = ? AND tier = ?`).bind(authorId, tier).run();
      await db.prepare(
        `INSERT INTO shadows (id, author_id, tier, r2_key, size_bytes, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(generateId(), authorId, tier, r2Key, (content as string).length, now, now).run();
    }

    logEvent('library_publish_shadow', { author: authorId });
    return c.json({ ok: true, url: `/library/${authorId}` });
  });

  // Publish monthly Pulse + Delta
  app.post('/library/publish/pulse', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);

    const body = await c.req.json().catch(() => null);
    if (!body || !body.pulse) return c.json({ error: 'Provide pulse content' }, 400);

    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const db = getDB();
    const r2 = getR2();
    const authorId = account.github_login;
    const month = body.month || currentMonth();
    const now = new Date().toISOString();
    const id = generateId();

    const pulseKey = `pulses/${authorId}/${month}/pulse.md`;
    await r2.put(pulseKey, body.pulse as string);

    let deltaKey: string | null = null;
    if (body.delta) {
      deltaKey = `pulses/${authorId}/${month}/delta.md`;
      await r2.put(deltaKey, body.delta as string);
    }

    // Upsert by author+month
    await db.prepare(
      `INSERT INTO pulses (id, author_id, month, r2_key_pulse, r2_key_delta, published_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(author_id, month) DO UPDATE SET r2_key_pulse = ?, r2_key_delta = ?, published_at = ?`
    ).bind(id, authorId, month, pulseKey, deltaKey, now, pulseKey, deltaKey, now).run();

    logEvent('library_publish_pulse', { author: authorId, month });
    return c.json({ ok: true, month });
  });

  // Publish quiz
  app.post('/library/publish/quiz', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);

    const body = await c.req.json().catch(() => null);
    if (!body || !body.title || !body.questions) return c.json({ error: 'Provide title and questions' }, 400);

    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const db = getDB();
    const r2 = getR2();
    const authorId = account.github_login;
    const id = generateId();
    const now = new Date().toISOString();

    const r2Key = `quizzes/${authorId}/${id}.json`;
    await r2.put(r2Key, JSON.stringify(body));

    await db.prepare(
      `INSERT INTO quizzes (id, author_id, title, subtitle, r2_key, published_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, authorId, body.title, body.subtitle || null, r2Key, now).run();

    logEvent('library_publish_quiz', { author: authorId, quiz_id: id, question_count: String(body.questions.length) });
    return c.json({ ok: true, quiz_id: id, url: `/library/${authorId}/quiz/${id}` });
  });

  // Publish work
  app.post('/library/publish/work', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);

    const body = await c.req.json().catch(() => null);
    if (!body || !body.title || !body.content) return c.json({ error: 'Provide title and content' }, 400);

    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const db = getDB();
    const r2 = getR2();
    const authorId = account.github_login;
    const id = generateId();
    const now = new Date().toISOString();
    const tier = body.tier || 'free';
    const medium = body.medium || 'essay';

    const r2Key = `works/${authorId}/${id}/content.md`;
    const content = body.content as string;
    if (content.length > 10 * 1024 * 1024) {
      return c.json({ error: 'Work content too large. Max 10MB.' }, 413);
    }
    await r2.put(r2Key, content);

    await db.prepare(
      `INSERT INTO works (id, author_id, title, medium, tier, r2_key, size_bytes, url, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, authorId, body.title, medium, tier, r2Key, content.length, body.url || null, now).run();

    logEvent('library_publish_work', { author: authorId, work_id: id, medium });
    return c.json({ ok: true, work_id: id });
  });

  // Update author settings
  app.put('/library/settings', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);

    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ error: 'Provide settings' }, 400);

    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const db = getDB();
    const authorId = account.github_login;
    const now = new Date().toISOString();

    // Build update fields
    const updates: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (body.display_name !== undefined) { updates.push('display_name = ?'); values.push(body.display_name); }
    if (body.bio !== undefined) { updates.push('bio = ?'); values.push(body.bio); }
    if (body.settings !== undefined) { updates.push('settings = ?'); values.push(JSON.stringify(body.settings)); }
    if (body.website !== undefined) { updates.push('website = ?'); values.push(body.website); }
    if (body.location !== undefined) { updates.push('location = ?'); values.push(body.location); }
    if (body.social_links !== undefined) { updates.push('social_links = ?'); values.push(JSON.stringify(body.social_links)); }

    values.push(authorId);
    await db.prepare(`UPDATE authors SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return c.json({ ok: true });
  });

  // Create promo code (Author-authenticated)
  app.post('/library/promo', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);
    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const body = await c.req.json().catch(() => null);
    if (!body || !body.artifact_type) return c.json({ error: 'Provide artifact_type' }, 400);

    const db = getDB();
    const authorId = account.github_login;
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    await db.prepare(
      'INSERT INTO promo_codes (id, code, author_id, artifact_type, artifact_id, discount_pct, uses_remaining, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(), code, authorId,
      body.artifact_type, body.artifact_id || null,
      body.discount_pct ?? 100,
      body.uses ?? 1,
      body.expires_at || null,
      new Date().toISOString()
    ).run();

    logEvent('promo_code_created', { author: authorId, code });
    return c.json({ code, discount_pct: body.discount_pct ?? 100, uses: body.uses ?? 1 });
  });

  // Validate promo code (public)
  app.get('/library/promo/:code', async (c) => {
    const code = c.req.param('code');
    const db = getDB();

    const promo = await db.prepare(
      'SELECT * FROM promo_codes WHERE code = ? AND (uses_remaining > 0 OR uses_remaining IS NULL) AND (expires_at IS NULL OR expires_at > ?)'
    ).bind(code, new Date().toISOString()).first<{
      author_id: string; artifact_type: string; artifact_id: string | null; discount_pct: number; uses_remaining: number;
    }>();

    if (!promo) return c.json({ error: 'Invalid or expired code' }, 404);
    return c.json({ valid: true, author_id: promo.author_id, artifact_type: promo.artifact_type, discount_pct: promo.discount_pct });
  });

  // Unpublish artifact
  app.delete('/library/unpublish/:type/:id', async (c) => {
    const key = extractApiKey(c);
    if (!key) return c.json({ error: 'Missing API key' }, 401);

    const account = await findByApiKey(key);
    if (!account) return c.json({ error: 'Invalid API key' }, 401);

    const db = getDB();
    const r2 = getR2();
    const type = c.req.param('type');
    const id = c.req.param('id');
    const authorId = account.github_login;

    if (type === 'shadow') {
      const shadow = await db.prepare('SELECT r2_key FROM shadows WHERE id = ? AND author_id = ?').bind(id, authorId).first<{ r2_key: string }>();
      if (shadow) {
        await r2.delete(shadow.r2_key);
        await db.prepare('DELETE FROM shadows WHERE id = ?').bind(id).run();
      }
    } else if (type === 'quiz') {
      const quiz = await db.prepare('SELECT r2_key FROM quizzes WHERE id = ? AND author_id = ?').bind(id, authorId).first<{ r2_key: string }>();
      if (quiz) {
        await r2.delete(quiz.r2_key);
        await db.prepare('UPDATE quizzes SET active = 0 WHERE id = ?').bind(id).run();
      }
    } else if (type === 'work') {
      const work = await db.prepare('SELECT r2_key FROM works WHERE id = ? AND author_id = ?').bind(id, authorId).first<{ r2_key: string }>();
      if (work) {
        await r2.delete(work.r2_key);
        await db.prepare('DELETE FROM works WHERE id = ?').bind(id).run();
      }
    } else {
      return c.json({ error: 'Unknown type. Use: shadow, quiz, work' }, 400);
    }

    logEvent('library_unpublish', { author: authorId, type, artifact_id: id });
    return c.json({ ok: true });
  });

  // =========================================================================
  // READING (public — universal data silo API)
  // Static single-segment routes MUST be registered before /:author catch-all
  // =========================================================================

  // Publish helper script (must be before /:author)
  app.get('/library/publish-script', (c) => {
    const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
    return c.text(`#!/usr/bin/env bash
# Alexandria Library publish helper
set -e
ALEX_DIR="$HOME/.alexandria"
API_KEY=$(cat "$ALEX_DIR/.api_key" 2>/dev/null)
SERVER="${SERVER_URL}"
if [ -z "$API_KEY" ]; then echo "No API key found at $ALEX_DIR/.api_key"; exit 1; fi
AUTH="Authorization: Bearer $API_KEY"
if [ -f "$ALEX_DIR/library/shadow_free.md" ] || [ -f "$ALEX_DIR/library/shadow_paid.md" ]; then
  FREE=""; PAID=""
  [ -f "$ALEX_DIR/library/shadow_free.md" ] && FREE=$(cat "$ALEX_DIR/library/shadow_free.md")
  [ -f "$ALEX_DIR/library/shadow_paid.md" ] && PAID=$(cat "$ALEX_DIR/library/shadow_paid.md")
  echo "Publishing shadow..."
  curl -s -X POST "$SERVER/library/publish/shadow" -H "$AUTH" -H "Content-Type: application/json" \\
    -d "$(jq -n --arg f "$FREE" --arg p "$PAID" '{free_shadow: $f, paid_shadow: $p}')"
  echo ""
fi
if [ -f "$ALEX_DIR/library/pulse.md" ]; then
  PULSE=$(cat "$ALEX_DIR/library/pulse.md"); DELTA=""
  [ -f "$ALEX_DIR/library/delta.md" ] && DELTA=$(cat "$ALEX_DIR/library/delta.md")
  echo "Publishing pulse..."
  curl -s -X POST "$SERVER/library/publish/pulse" -H "$AUTH" -H "Content-Type: application/json" \\
    -d "$(jq -n --arg p "$PULSE" --arg d "$DELTA" '{pulse: $p, delta: $d}')"
  echo ""
fi
if [ -f "$ALEX_DIR/library/quiz.json" ]; then
  echo "Publishing quiz..."
  curl -s -X POST "$SERVER/library/publish/quiz" -H "$AUTH" -H "Content-Type: application/json" -d @"$ALEX_DIR/library/quiz.json"
  echo ""
fi
echo "Done."
`);
  });

  // List all published authors (must be before /:author)
  app.get('/library/authors', async (c) => {
    const db = getDB();
    const { results } = await db.prepare(
      `SELECT a.id, a.display_name, a.bio, a.settings, a.website, a.location, a.social_links, a.published_at, a.updated_at,
              (SELECT COUNT(*) FROM shadows WHERE author_id = a.id) as shadow_count,
              (SELECT COUNT(*) FROM quizzes WHERE author_id = a.id AND active = 1) as quiz_count,
              (SELECT COUNT(*) FROM works WHERE author_id = a.id) as work_count
       FROM authors a ORDER BY a.updated_at DESC`
    ).all();
    return c.json({ authors: results });
  });

  // Author profile metadata
  app.get('/library/:author', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const author = await db.prepare('SELECT * FROM authors WHERE id = ?').bind(authorId).first();
    if (!author) return c.json({ error: 'Author not found' }, 404);

    const shadows = await db.prepare('SELECT id, tier, size_bytes, updated_at FROM shadows WHERE author_id = ?').bind(authorId).all();
    const quizzes = await db.prepare('SELECT id, title, subtitle, published_at FROM quizzes WHERE author_id = ? AND active = 1').bind(authorId).all();
    const works = await db.prepare('SELECT id, title, medium, tier, url, published_at FROM works WHERE author_id = ?').bind(authorId).all();
    const latestPulse = await db.prepare('SELECT * FROM pulses WHERE author_id = ? ORDER BY month DESC LIMIT 1').bind(authorId).first();

    // Extract chapter titles from paid shadow for TOC teaser
    let shadow_chapters: string[] = [];
    const paidShadow = shadows.results?.find((s: any) => s.tier === 'paid');
    if (paidShadow) {
      try {
        const r2 = getR2();
        const obj = await r2.get(`shadows/${authorId}/paid.md`);
        if (obj) {
          const text = await obj.text();
          shadow_chapters = text.split('\n').filter((l: string) => l.startsWith('## ')).map((l: string) => l.replace('## ', ''));
        }
      } catch {}
    }

    logEvent('library_author_view', { author: authorId });

    return c.json({ author, shadows: shadows.results, quizzes: quizzes.results, works: works.results, latest_pulse: latestPulse, shadow_chapters });
  });

  // Read free shadow
  app.get('/library/:author/shadow/free', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const r2 = getR2();

    const shadow = await db.prepare('SELECT * FROM shadows WHERE author_id = ? AND tier = ?').bind(authorId, 'free').first<{ id: string; r2_key: string }>();
    if (!shadow) return c.json({ error: 'No free shadow published' }, 404);

    const obj = await r2.get(shadow.r2_key);
    if (!obj) return c.json({ error: 'Shadow content not found' }, 404);

    const accessorKey = extractApiKey(c);
    recordAccess('shadow_view', authorId, accessorKey, shadow.id, 'free');
    logEvent('library_shadow_view', { author: authorId, tier: 'free' });

    return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'), 'public, max-age=300');
  });

  // Read paid shadow (requires auth + payment)
  app.get('/library/:author/shadow/paid', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const r2 = getR2();

    const shadow = await db.prepare('SELECT * FROM shadows WHERE author_id = ? AND tier = ?').bind(authorId, 'paid').first<{ id: string; r2_key: string }>();
    if (!shadow) return c.json({ error: 'No paid shadow published' }, 404);

    const accessorKey = extractApiKey(c);

    // If this is the owning Author, serve for free
    if (accessorKey) {
      const accessor = await findByApiKey(accessorKey);
      if (accessor && accessor.github_login === authorId) {
        const obj = await r2.get(shadow.r2_key);
        if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
        return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
      }

      // Authenticated user with active subscription — free access to all shadows
      if (accessor) {
        if (accessor.subscription_id) {
          const obj = await r2.get(shadow.r2_key);
          if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
          recordAccess('shadow_view', authorId, accessor.github_login, shadow.id, 'paid');
          logEvent('library_paid_access_free', { author: authorId, accessor: accessor.github_login });
          return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
        }

        // Non-subscriber authenticated user — add to billing tab
        const author = await db.prepare('SELECT settings FROM authors WHERE id = ?').bind(authorId).first<{ settings: string }>();
        const settings = JSON.parse(author?.settings || '{}');
        const priceCents = settings.paid_price_cents;
        if (!priceCents) {
          return c.json({ error: 'Author has not set a price for paid access' }, 404);
        }
        const cutPercent = parseFloat(process.env.LIBRARY_CUT_PERCENT || '50') / 100;
        const alexandriaCut = Math.round(priceCents * cutPercent);
        const authorCut = priceCents - alexandriaCut;

        await db.prepare(
          `INSERT INTO billing_tab (accessor_id, author_id, artifact_type, amount_cents, alexandria_cut_cents, author_cut_cents, month, created_at)
           VALUES (?, ?, 'shadow', ?, ?, ?, ?, ?)`
        ).bind(accessor.github_login, authorId, priceCents, alexandriaCut, authorCut, currentMonth(), new Date().toISOString()).run();

        const obj = await r2.get(shadow.r2_key);
        if (!obj) return c.json({ error: 'Shadow content not found' }, 404);

        recordAccess('shadow_view', authorId, accessor.github_login, shadow.id, 'paid');
        logEvent('library_paid_access', { author: authorId, accessor: accessor.github_login, artifact_type: 'shadow', amount_cents: String(priceCents) });

        return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
      }
    }

    // Token-based access (for AI agents — the primary access method)
    const token = c.req.query('token');
    if (token) {
      const tokenRow = await db.prepare(
        'SELECT * FROM shadow_tokens WHERE token = ? AND author_id = ? AND revoked_at IS NULL'
      ).bind(token, authorId).first<{ id: string; access_count: number; last_used_at: string | null }>();
      if (tokenRow) {
        // Rate limit: 100 reads per day (reset daily based on last_used_at date)
        const today = new Date().toISOString().slice(0, 10);
        const lastDay = tokenRow.last_used_at ? tokenRow.last_used_at.slice(0, 10) : '';
        const currentCount = lastDay === today ? tokenRow.access_count : 0;
        if (currentCount >= 100) {
          return c.json({ error: 'Rate limit exceeded. Resets daily.' }, 429);
        }
        await db.prepare(
          'UPDATE shadow_tokens SET access_count = ?, last_used_at = ? WHERE id = ?'
        ).bind(currentCount + 1, new Date().toISOString(), tokenRow.id).run();

        const obj = await r2.get(shadow.r2_key);
        if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
        recordAccess('shadow_view', authorId, token, shadow.id, 'paid');
        // Token IS the auth — allow any origin so AI tools (GPT, Claude, etc.) can fetch
        return new Response(obj.body, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
          },
        });
      }
      return c.json({ error: 'Invalid or revoked token' }, 401);
    }

    // Non-Author, no token — return 402 with checkout info
    const author = await db.prepare('SELECT settings FROM authors WHERE id = ?').bind(authorId).first<{ settings: string }>();
    const settings = JSON.parse(author?.settings || '{}');
    const priceCents = settings.paid_price_cents;
    if (!priceCents) return c.json({ error: 'Author has not set a price for paid access' }, 404);

    return c.json({
      error: 'Payment required',
      price_cents: priceCents,
      checkout_url: `/library/${authorId}/checkout/shadow`,
    }, 402);
  });

  // Checkout — create Stripe session for paid shadow (slider: min price, reader can pay more)
  // Generate personal access token after Stripe payment
  app.get('/library/:author/access', async (c) => {
    const authorId = c.req.param('author');
    const sessionId = c.req.query('session_id');
    if (!sessionId) return c.json({ error: 'Missing session_id' }, 400);

    // Verify the session grant exists in KV
    try {
      const { getKV } = await import('./kv.js');
      const kv = getKV();
      const grant = await kv.get(`library:access:${sessionId}`);
      if (!grant) return c.json({ error: 'No access grant found. Payment may still be processing.' }, 404);

      const parsed = JSON.parse(grant);
      if (parsed.author_id !== authorId) return c.json({ error: 'Access grant does not match author' }, 403);

      // Check if token already exists for this session
      const db = getDB();
      const existing = await db.prepare('SELECT token FROM shadow_tokens WHERE session_id = ?').bind(sessionId).first<{ token: string }>();
      if (existing) {
        return c.json({
          token: existing.token,
          api_url: `${process.env.AI_SERVER_URL || 'https://alexandria-server.benjamin-d31.workers.dev'}/library/${authorId}/shadow/paid?token=${existing.token}`,
        });
      }

      // Generate new token
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const token = 'shadow_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

      await db.prepare(
        'INSERT INTO shadow_tokens (id, token, author_id, session_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), token, authorId, sessionId, new Date().toISOString()).run();

      logEvent('shadow_token_created', { author: authorId });
      return c.json({
        token,
        api_url: `${process.env.AI_SERVER_URL || 'https://alexandria-server.benjamin-d31.workers.dev'}/library/${authorId}/shadow/paid?token=${token}`,
      });
    } catch (e) {
      console.error('[library] Token generation failed:', e);
      return c.json({ error: 'Failed to generate access token' }, 500);
    }
  });

  app.post('/library/:author/checkout/shadow', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();

    const body = await c.req.json().catch(() => ({}));
    const promoCode = (body as any)?.promo_code;

    const author = await db.prepare('SELECT * FROM authors WHERE id = ?').bind(authorId).first<{ display_name: string; settings: string }>();
    if (!author) return c.json({ error: 'Author not found' }, 404);

    const settings = JSON.parse(author.settings || '{}');
    const floorCents = settings.paid_price_cents || 200;
    const requestedCents = (body as any)?.amount_cents;
    let amountCents = requestedCents && requestedCents >= floorCents ? requestedCents : floorCents;

    const shadow = await db.prepare('SELECT id FROM shadows WHERE author_id = ? AND tier = ?').bind(authorId, 'paid').first<{ id: string }>();
    if (!shadow) return c.json({ error: 'No paid shadow' }, 404);

    // Apply promo code
    if (promoCode) {
      const promo = await db.prepare(
        'SELECT * FROM promo_codes WHERE code = ? AND author_id = ? AND (uses_remaining > 0 OR uses_remaining IS NULL) AND (expires_at IS NULL OR expires_at > ?)'
      ).bind(promoCode, authorId, new Date().toISOString()).first<{ id: string; discount_pct: number; uses_remaining: number }>();

      if (promo) {
        if (promo.discount_pct >= 100) {
          // Full discount — grant access directly, no Stripe
          await db.prepare('UPDATE promo_codes SET uses_remaining = uses_remaining - 1 WHERE id = ? AND uses_remaining > 0').bind(promo.id).run();

          // Store access grant in KV
          const fakeSessionId = `promo_${crypto.randomUUID()}`;
          const { getKV } = await import('./kv.js');
          const kv = getKV();
          await kv.put(`library:access:${fakeSessionId}`, JSON.stringify({
            author_id: authorId, artifact_type: 'shadow', artifact_id: shadow.id, granted_at: new Date().toISOString(),
          }), { expirationTtl: 30 * 24 * 60 * 60 });

          logEvent('promo_code_redeemed', { author: authorId, code: promoCode, discount: '100' });
          const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
          return c.json({ url: `${WEBSITE_URL}/library/${authorId}?access=granted&session_id=${fakeSessionId}&artifact_type=shadow&artifact_id=${shadow.id}` });
        }
        // Partial discount
        amountCents = Math.round(amountCents * (1 - promo.discount_pct / 100));
        await db.prepare('UPDATE promo_codes SET uses_remaining = uses_remaining - 1 WHERE id = ? AND uses_remaining > 0').bind(promo.id).run();
        logEvent('promo_code_redeemed', { author: authorId, code: promoCode, discount: String(promo.discount_pct) });
      }
    }

    try {
      const { createLibraryCheckoutWithSlider } = await import('./billing.js');
      const url = await createLibraryCheckoutWithSlider({
        authorId,
        authorDisplayName: author.display_name || authorId,
        artifactType: 'shadow',
        artifactId: shadow.id,
        minCents: Math.max(amountCents, 100), // Stripe minimum $1
      });
      return c.json({ url });
    } catch (e) {
      console.error('[library] Checkout creation failed:', e);
      return c.json({ error: 'Checkout failed' }, 500);
    }
  });

  // Works checkout (mirrors shadow checkout)
  app.post('/library/:author/checkout/work', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();

    const body = await c.req.json().catch(() => ({}));
    const workId = (body as any)?.work_id;
    if (!workId) return c.json({ error: 'work_id required' }, 400);

    const author = await db.prepare('SELECT * FROM authors WHERE id = ?').bind(authorId).first<{ display_name: string; settings: string }>();
    if (!author) return c.json({ error: 'Author not found' }, 404);

    const work = await db.prepare('SELECT id, title, tier FROM works WHERE id = ? AND author_id = ? AND tier = ?').bind(workId, authorId, 'paid').first<{ id: string; title: string }>();
    if (!work) return c.json({ error: 'No paid work found' }, 404);

    const settings = JSON.parse(author.settings || '{}');
    const floorCents = settings.paid_price_cents || 200;
    const requestedCents = (body as any)?.amount_cents;
    let amountCents = requestedCents && requestedCents >= floorCents ? requestedCents : floorCents;

    const promoCode = (body as any)?.promo_code;
    if (promoCode) {
      const promo = await db.prepare(
        'SELECT * FROM promo_codes WHERE code = ? AND author_id = ? AND (uses_remaining > 0 OR uses_remaining IS NULL) AND (expires_at IS NULL OR expires_at > ?)'
      ).bind(promoCode, authorId, new Date().toISOString()).first<{ id: string; discount_pct: number; uses_remaining: number }>();

      if (promo) {
        if (promo.discount_pct >= 100) {
          await db.prepare('UPDATE promo_codes SET uses_remaining = uses_remaining - 1 WHERE id = ? AND uses_remaining > 0').bind(promo.id).run();
          const fakeSessionId = `promo_${crypto.randomUUID()}`;
          const { getKV } = await import('./kv.js');
          const kv = getKV();
          await kv.put(`library:access:${fakeSessionId}`, JSON.stringify({
            author_id: authorId, artifact_type: 'work', artifact_id: workId, granted_at: new Date().toISOString(),
          }), { expirationTtl: 30 * 24 * 60 * 60 });
          logEvent('promo_code_redeemed', { author: authorId, code: promoCode, discount: '100' });
          const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
          return c.json({ url: `${WEBSITE_URL}/library/${authorId}?access=granted&session_id=${fakeSessionId}&artifact_type=work&artifact_id=${workId}` });
        }
        amountCents = Math.round(amountCents * (1 - promo.discount_pct / 100));
        await db.prepare('UPDATE promo_codes SET uses_remaining = uses_remaining - 1 WHERE id = ? AND uses_remaining > 0').bind(promo.id).run();
        logEvent('promo_code_redeemed', { author: authorId, code: promoCode, discount: String(promo.discount_pct) });
      }
    }

    try {
      const { createLibraryCheckoutWithSlider } = await import('./billing.js');
      const url = await createLibraryCheckoutWithSlider({
        authorId,
        authorDisplayName: author.display_name || authorId,
        artifactType: 'work',
        artifactId: workId,
        minCents: Math.max(amountCents, 100),
      });
      return c.json({ url });
    } catch (e) {
      console.error('[library] Work checkout creation failed:', e);
      return c.json({ error: 'Checkout failed' }, 500);
    }
  });

  // Read latest or specific pulse
  app.get('/library/:author/pulse/:month?', async (c) => {
    const authorId = c.req.param('author');
    const month = c.req.param('month');
    const db = getDB();
    const r2 = getR2();

    let pulse;
    if (month) {
      pulse = await db.prepare('SELECT * FROM pulses WHERE author_id = ? AND month = ?').bind(authorId, month).first<{ r2_key_pulse: string }>();
    } else {
      pulse = await db.prepare('SELECT * FROM pulses WHERE author_id = ? ORDER BY month DESC LIMIT 1').bind(authorId).first<{ r2_key_pulse: string }>();
    }
    if (!pulse) return c.json({ error: 'No pulse found' }, 404);

    const obj = await r2.get(pulse.r2_key_pulse);
    if (!obj) return c.json({ error: 'Pulse content not found' }, 404);

    recordAccess('pulse_view', authorId, extractApiKey(c), null, null);
    logEvent('library_pulse_view', { author: authorId });

    return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'), 'public, max-age=300');
  });

  // Read delta (Author-only)
  app.get('/library/:author/delta/:month?', async (c) => {
    const authorId = c.req.param('author');
    const accessorKey = extractApiKey(c);
    if (!accessorKey) return c.json({ error: 'Authentication required' }, 401);

    const accessor = await findByApiKey(accessorKey);
    if (!accessor || accessor.github_login !== authorId) return c.json({ error: 'Delta is private — Author-only' }, 403);

    const month = c.req.param('month');
    const db = getDB();
    const r2 = getR2();

    let pulse;
    if (month) {
      pulse = await db.prepare('SELECT * FROM pulses WHERE author_id = ? AND month = ?').bind(authorId, month).first<{ r2_key_delta: string | null }>();
    } else {
      pulse = await db.prepare('SELECT * FROM pulses WHERE author_id = ? ORDER BY month DESC LIMIT 1').bind(authorId).first<{ r2_key_delta: string | null }>();
    }
    if (!pulse || !pulse.r2_key_delta) return c.json({ error: 'No delta found' }, 404);

    const obj = await r2.get(pulse.r2_key_delta);
    if (!obj) return c.json({ error: 'Delta content not found' }, 404);

    return r2Response(obj.body, 'text/markdown; charset=utf-8');
  });

  // List author's active quizzes
  app.get('/library/:author/quizzes', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const { results } = await db.prepare(
      `SELECT q.id, q.title, q.published_at,
              (SELECT COUNT(*) FROM quiz_results WHERE quiz_id = q.id) as completions
       FROM quizzes q WHERE q.author_id = ? AND q.active = 1 ORDER BY q.published_at DESC`
    ).bind(authorId).all();
    return c.json({ quizzes: results });
  });

  // Get quiz data
  app.get('/library/:author/quiz/:id', async (c) => {
    const quizId = c.req.param('id');
    const db = getDB();
    const r2 = getR2();

    const quiz = await db.prepare('SELECT * FROM quizzes WHERE id = ? AND active = 1').bind(quizId).first<{ r2_key: string; author_id: string }>();
    if (!quiz) return c.json({ error: 'Quiz not found' }, 404);

    const obj = await r2.get(quiz.r2_key);
    if (!obj) return c.json({ error: 'Quiz data not found' }, 404);

    const data = await obj.text();
    const parsed = JSON.parse(data);

    // Keep correct answers — quiz reveals in real-time, not a secure exam
    return c.json({ quiz_id: quizId, author_id: quiz.author_id, ...parsed });
  });

  // Submit quiz answers
  app.post('/library/:author/quiz/:id/submit', async (c) => {
    const quizId = c.req.param('id');
    const authorId = c.req.param('author');
    const db = getDB();
    const r2 = getR2();

    const body = await c.req.json().catch(() => null);
    if (!body || !body.answers) return c.json({ error: 'Provide answers' }, 400);

    const quiz = await db.prepare('SELECT * FROM quizzes WHERE id = ? AND active = 1').bind(quizId).first<{ r2_key: string }>();
    if (!quiz) return c.json({ error: 'Quiz not found' }, 404);

    const obj = await r2.get(quiz.r2_key);
    if (!obj) return c.json({ error: 'Quiz data not found' }, 404);

    const data = JSON.parse(await obj.text());
    const answers = body.answers as Record<string, string>;

    // Score — flexible: supports MCQ (questions[].correct) or custom scoring functions
    let correct = 0;
    let total = 0;
    if (data.questions && Array.isArray(data.questions)) {
      total = data.questions.length;
      for (const q of data.questions) {
        const key = q.id || q.key || String(data.questions.indexOf(q));
        const correctAnswer = q.correct || q.answer;
        if (correctAnswer && answers[key] === correctAnswer) correct++;
      }
    }
    const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Generate result slug
    const slugBytes = crypto.getRandomValues(new Uint8Array(4));
    const resultSlug = Array.from(slugBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const id = generateId();
    const accessorKey = extractApiKey(c);
    const takerId = accessorKey ? (await findByApiKey(accessorKey))?.github_login || null : null;

    await db.prepare(
      `INSERT INTO quiz_results (id, quiz_id, taker_id, score_pct, result_slug, taken_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, quizId, takerId, scorePct, resultSlug, new Date().toISOString()).run();

    recordAccess('quiz_take', authorId, takerId, quizId, 'free');
    logEvent('library_quiz_taken', { author: authorId, quiz_id: quizId, score_pct: String(scorePct) });

    // Determine result tier
    let resultTier = { label: '', message: '' };
    if (data.result_tiers && data.result_tiers.length > 0) {
      const sorted = [...data.result_tiers].sort((a: any, b: any) => b.min_pct - a.min_pct);
      for (const tier of sorted) {
        if (scorePct >= tier.min_pct) { resultTier = tier; break; }
      }
    }

    return c.json({
      score_pct: scorePct,
      correct,
      total,
      result_slug: resultSlug,
      result_tier: resultTier,
      share_url: `/library/${authorId}/quiz/${quizId}/result/${resultSlug}`,
    });
  });

  // Get shareable quiz result
  app.get('/library/:author/quiz/:id/result/:slug', async (c) => {
    const slug = c.req.param('slug');
    const quizId = c.req.param('id');
    const authorId = c.req.param('author');
    const db = getDB();

    const result = await db.prepare(
      'SELECT * FROM quiz_results WHERE result_slug = ? AND quiz_id = ?'
    ).bind(slug, quizId).first();
    if (!result) return c.json({ error: 'Result not found' }, 404);

    const quiz = await db.prepare('SELECT title FROM quizzes WHERE id = ?').bind(quizId).first<{ title: string }>();
    const author = await db.prepare('SELECT display_name FROM authors WHERE id = ?').bind(authorId).first<{ display_name: string }>();

    recordAccess('quiz_share_view', authorId, null, quizId, null);
    logEvent('library_quiz_share_view', { author: authorId, quiz_id: quizId, slug });

    return c.json({
      author_id: authorId,
      author_name: author?.display_name || authorId,
      quiz_title: quiz?.title || '',
      score_pct: result.score_pct,
      taken_at: result.taken_at,
    });
  });

  // List author's works
  app.get('/library/:author/works', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const { results } = await db.prepare(
      'SELECT id, title, medium, tier, size_bytes, published_at FROM works WHERE author_id = ? ORDER BY published_at DESC'
    ).bind(authorId).all();
    return c.json({ works: results });
  });

  // Get specific work
  app.get('/library/:author/work/:id', async (c) => {
    const workId = c.req.param('id');
    const authorId = c.req.param('author');
    const db = getDB();
    const r2 = getR2();

    const work = await db.prepare('SELECT * FROM works WHERE id = ? AND author_id = ?').bind(workId, authorId).first<{ r2_key: string; tier: string }>();
    if (!work) return c.json({ error: 'Work not found' }, 404);

    // Paid works follow same pattern as paid shadows (tab billing)
    if (work.tier === 'paid') {
      const accessorKey = extractApiKey(c);
      if (accessorKey) {
        const { findByApiKey } = await import('./prosumer.js');
        const accessor = await findByApiKey(accessorKey);

        // Owner bypass — Author accessing their own work
        if (accessor && accessor.github_login === authorId) {
          const obj = await r2.get(work.r2_key);
          if (!obj) return c.json({ error: 'Work content not found' }, 404);
          return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
        }

        // Authenticated accessor with active subscription — free access
        if (accessor) {
          if (accessor.subscription_id) {
            const obj = await r2.get(work.r2_key);
            if (!obj) return c.json({ error: 'Work content not found' }, 404);
            recordAccess('work_view', authorId, accessor.github_login, workId, 'paid');
            logEvent('library_paid_access_free', { author: authorId, accessor: accessor.github_login });
            return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
          }

          // Non-subscriber — tab billing
          const authorData = await db.prepare('SELECT settings FROM authors WHERE id = ?').bind(authorId).first<{ settings: string }>();
          const settings = JSON.parse(authorData?.settings || '{}');
          const priceCents = settings.paid_price_cents;
          if (!priceCents) return c.json({ error: 'Author has not set a price for paid access' }, 404);

          const cutPercent = parseFloat(process.env.LIBRARY_CUT_PERCENT || '50') / 100;
          const alexandriaCut = Math.round(priceCents * cutPercent);
          const authorCut = priceCents - alexandriaCut;

          await db.prepare(
            `INSERT INTO billing_tab (accessor_id, author_id, artifact_type, amount_cents, alexandria_cut_cents, author_cut_cents, month, created_at)
             VALUES (?, ?, 'work', ?, ?, ?, ?, ?)`
          ).bind(accessor.github_login, authorId, priceCents, alexandriaCut, authorCut, currentMonth(), new Date().toISOString()).run();

          const obj = await r2.get(work.r2_key);
          if (!obj) return c.json({ error: 'Work content not found' }, 404);

          recordAccess('work_view', authorId, accessor.github_login, workId, 'paid');
          logEvent('library_paid_access', { author: authorId, accessor: accessor.github_login, artifact_type: 'work', amount_cents: String(priceCents) });

          return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
        }
      }

      // Unauthenticated — return 402 with checkout URL
      const authorSettings = await db.prepare('SELECT settings FROM authors WHERE id = ?').bind(authorId).first<{ settings: string }>();
      const s = JSON.parse(authorSettings?.settings || '{}');
      const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
      return c.json({
        error: 'Payment required',
        price_cents: s.paid_price_cents || null,
        checkout_url: `${WEBSITE_URL}/library/${authorId}/checkout/work?work_id=${workId}`,
      }, 402);
    }

    const obj = await r2.get(work.r2_key);
    if (!obj) return c.json({ error: 'Work content not found' }, 404);

    recordAccess('work_view', authorId, extractApiKey(c), workId, work.tier);
    logEvent('library_work_view', { author: authorId, work_id: workId, tier: work.tier });

    return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'), 'public, max-age=300');
  });

  // Author earnings summary
  app.get('/library/earnings/:author', async (c) => {
    const authorId = c.req.param('author');
    const accessorKey = extractApiKey(c);
    if (!accessorKey) return c.json({ error: 'Authentication required' }, 401);

    const accessor = await findByApiKey(accessorKey);
    if (!accessor || accessor.github_login !== authorId) return c.json({ error: 'Earnings are private' }, 403);

    const db = getDB();
    const { results } = await db.prepare(
      `SELECT month, SUM(author_cut_cents) as earnings_cents, COUNT(*) as transactions
       FROM billing_tab WHERE author_id = ? GROUP BY month ORDER BY month DESC`
    ).bind(authorId).all();

    const totalAccess = await db.prepare(
      'SELECT COUNT(*) as total FROM access_log WHERE author_id = ?'
    ).bind(authorId).first<{ total: number }>();

    const quizConversions = await db.prepare(
      'SELECT COUNT(*) as total FROM referrals WHERE author_id = ?'
    ).bind(authorId).first<{ total: number }>();

    return c.json({ earnings_by_month: results, total_access: totalAccess?.total || 0, quiz_conversions: quizConversions?.total || 0 });
  });

  // Author stats (Author-authenticated)
  app.get('/library/:author/stats', async (c) => {
    const authorId = c.req.param('author');
    const accessorKey = extractApiKey(c);
    if (!accessorKey) return c.json({ error: 'Authentication required' }, 401);

    const accessor = await findByApiKey(accessorKey);
    if (!accessor || accessor.github_login !== authorId) return c.json({ error: 'Stats are private' }, 403);

    const db = getDB();

    const [accessCounts, referralSignups, earnings] = await Promise.all([
      db.prepare(
        `SELECT event, COUNT(*) as total FROM access_log WHERE author_id = ? AND event IN ('shadow_view', 'quiz_take', 'quiz_share_view') GROUP BY event`
      ).bind(authorId).all(),
      db.prepare('SELECT COUNT(*) as total FROM referrals WHERE author_id = ?').bind(authorId).first<{ total: number }>(),
      db.prepare('SELECT SUM(author_cut_cents) as total FROM billing_tab WHERE author_id = ?').bind(authorId).first<{ total: number }>(),
    ]);

    const counts: Record<string, number> = {};
    for (const row of (accessCounts.results || []) as Array<{ event: string; total: number }>) {
      counts[row.event] = row.total;
    }

    return c.json({
      shadow_views: counts['shadow_view'] || 0,
      quiz_plays: counts['quiz_take'] || 0,
      quiz_share_views: counts['quiz_share_view'] || 0,
      referral_signups: referralSignups?.total || 0,
      total_earnings_cents: earnings?.total || 0,
    });
  });

}
