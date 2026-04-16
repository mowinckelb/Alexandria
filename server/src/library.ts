/**
 * Library — read-only company layer
 *
 * Published artifacts: shadows, pulses, quizzes, works.
 * Publishing goes through the protocol (PUT /file/{name}).
 * This file serves the website's read endpoints only.
 */

import { Hono } from 'hono';
import { getDB, getR2, generateId } from './db.js';
import { logEvent } from './analytics.js';
import { extractApiKey, findByApiKey } from './auth.js';
import { getAllowedOrigins } from './cors.js';

// ---------------------------------------------------------------------------
// CORS-safe R2 response
// ---------------------------------------------------------------------------

function r2Response(body: ReadableStream | null, contentType: string, reqOrigin?: string | null, cache?: string): Response {
  const allowed = getAllowedOrigins();
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Vary': 'Origin',
  };
  if (reqOrigin && allowed.includes(reqOrigin)) {
    headers['Access-Control-Allow-Origin'] = reqOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }
  if (cache) headers['Cache-Control'] = cache;
  return new Response(body, { headers });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function isValidAuthorId(id: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(id) && id.length <= 39;
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
  // LIST AUTHORS (must be before /:author catch-all)
  // =========================================================================

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

  // =========================================================================
  // AUTHOR PROFILE
  // =========================================================================

  app.get('/library/:author', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const author = await db.prepare('SELECT * FROM authors WHERE id = ?').bind(authorId).first();
    if (!author) return c.json({ error: 'Author not found' }, 404);

    const [shadows, quizzes, works, latestPulse] = await Promise.all([
      db.prepare('SELECT id, visibility, price_cents, size_bytes, title, updated_at, r2_key FROM shadows WHERE author_id = ?').bind(authorId).all(),
      db.prepare('SELECT id, title, subtitle, published_at FROM quizzes WHERE author_id = ? AND active = 1').bind(authorId).all(),
      db.prepare('SELECT id, title, medium, tier, url, published_at FROM works WHERE author_id = ?').bind(authorId).all(),
      db.prepare('SELECT * FROM pulses WHERE author_id = ? ORDER BY month DESC LIMIT 1').bind(authorId).first(),
    ]);

    // Extract chapter titles from first non-public shadow for TOC teaser
    let shadow_chapters: string[] = [];
    const gatedShadow = shadows.results?.find((s: any) => s.visibility !== 'public');
    if (gatedShadow) {
      try {
        const r2 = getR2();
        const obj = await r2.get((gatedShadow as any).r2_key || '');
        if (obj) {
          const text = await obj.text();
          shadow_chapters = text.split('\n').filter((l: string) => l.startsWith('## ')).map((l: string) => l.replace('## ', ''));
        }
      } catch {}
    }

    logEvent('library_author_view', { author: authorId });

    return c.json({ author, shadows: shadows.results, quizzes: quizzes.results, works: works.results, latest_pulse: latestPulse, shadow_chapters });
  });

  // =========================================================================
  // SHADOWS
  // =========================================================================

  // Public/free shadow
  app.get('/library/:author/shadow/free', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const shadow = await db.prepare(
      `SELECT * FROM shadows WHERE author_id = ? AND visibility = 'public' LIMIT 1`
    ).bind(authorId).first<{ id: string; r2_key: string }>();
    if (!shadow) return c.json({ error: 'No public shadow' }, 404);

    const r2 = getR2();
    const obj = await r2.get(shadow.r2_key);
    if (!obj) return c.json({ error: 'Shadow content not found' }, 404);

    logEvent('library_shadow_view', { author: authorId, visibility: 'public' });

    // Deliberately more permissive than the CORS middleware — public shadows are open content
    return new Response(obj.body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  });

  // Shadow by ID — access determined by visibility
  app.get('/library/:author/shadow/:shadowId', async (c) => {
    const authorId = c.req.param('author');
    const shadowId = c.req.param('shadowId');
    const db = getDB();
    const r2 = getR2();

    const shadow = await db.prepare(
      'SELECT * FROM shadows WHERE id = ? AND author_id = ?'
    ).bind(shadowId, authorId).first<{ id: string; r2_key: string; visibility: string; price_cents: number }>();
    if (!shadow) return c.json({ error: 'Shadow not found' }, 404);

    const accessorKey = extractApiKey(c);
    const accessor = accessorKey ? await findByApiKey(accessorKey) : null;

    // Owner always has access
    if (accessor && accessor.github_login === authorId) {
      const obj = await r2.get(shadow.r2_key);
      if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
      return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
    }

    // Public shadows — anyone
    if (shadow.visibility === 'public') {
      const obj = await r2.get(shadow.r2_key);
      if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
      logEvent('library_shadow_view', { author: authorId, visibility: 'public' });
      // Deliberately more permissive than the CORS middleware — public shadows are open content
      return new Response(obj.body, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
      });
    }

    // Authors shadows — any authenticated Author
    if (shadow.visibility === 'authors') {
      if (accessor) {
        const obj = await r2.get(shadow.r2_key);
        if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
        logEvent('library_shadow_view', { author: authorId, visibility: 'authors', accessor: accessor.github_login });
        return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
      }
      return c.json({ error: 'Authors only — requires Alexandria API key', visibility: 'authors' }, 401);
    }

    // Invite shadows — token only
    if (shadow.visibility === 'invite') {
      const token = c.req.query('token');
      if (token) {
        const tokenRow = await db.prepare(
          'SELECT * FROM shadow_tokens WHERE token = ? AND author_id = ? AND revoked_at IS NULL'
        ).bind(token, authorId).first<{ id: string }>();
        if (tokenRow) {
          await db.prepare(
            'UPDATE shadow_tokens SET access_count = access_count + 1, last_used_at = ? WHERE id = ?'
          ).bind(new Date().toISOString(), tokenRow.id).run();

          const obj = await r2.get(shadow.r2_key);
          if (!obj) return c.json({ error: 'Shadow content not found' }, 404);
          logEvent('library_shadow_view', { author: authorId, visibility: 'invite' });
          // Deliberately more permissive than the CORS middleware — invite links are shareable
          return new Response(obj.body, {
            headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
          });
        }
        return c.json({ error: 'Invalid or revoked token' }, 401);
      }
      return c.json({ error: 'Invite only — requires access token', visibility: 'invite' }, 401);
    }

    return c.json({ error: 'Access denied' }, 403);
  });

  // =========================================================================
  // PULSE
  // =========================================================================

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

    logEvent('library_pulse_view', { author: authorId });

    return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'), 'public, max-age=300');
  });

  // =========================================================================
  // QUIZZES
  // =========================================================================

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

    return c.json({ quiz_id: quizId, author_id: quiz.author_id, ...parsed });
  });

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

    // Score
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

    logEvent('library_quiz_share_view', { author: authorId, quiz_id: quizId, slug });

    return c.json({
      author_id: authorId,
      author_name: author?.display_name || authorId,
      quiz_title: quiz?.title || '',
      score_pct: result.score_pct,
      taken_at: result.taken_at,
    });
  });

  // =========================================================================
  // WORKS
  // =========================================================================

  app.get('/library/:author/works', async (c) => {
    const authorId = c.req.param('author');
    const db = getDB();
    const { results } = await db.prepare(
      'SELECT id, title, medium, tier, size_bytes, published_at FROM works WHERE author_id = ? ORDER BY published_at DESC'
    ).bind(authorId).all();
    return c.json({ works: results });
  });

  app.get('/library/:author/work/:id', async (c) => {
    const workId = c.req.param('id');
    const authorId = c.req.param('author');
    const db = getDB();
    const r2 = getR2();

    const work = await db.prepare('SELECT * FROM works WHERE id = ? AND author_id = ?').bind(workId, authorId).first<{ r2_key: string; tier: string }>();
    if (!work) return c.json({ error: 'Work not found' }, 404);

    // Paid works require authentication
    if (work.tier === 'paid') {
      const accessorKey = extractApiKey(c);
      if (!accessorKey) return c.json({ error: 'Authentication required for paid works' }, 401);
      const accessor = await findByApiKey(accessorKey);
      if (!accessor) return c.json({ error: 'Invalid API key' }, 401);

      // Owner or subscriber gets access
      if (accessor.github_login !== authorId && !accessor.subscription_id) {
        return c.json({ error: 'Subscription required for paid works' }, 402);
      }

      const obj = await r2.get(work.r2_key);
      if (!obj) return c.json({ error: 'Work content not found' }, 404);
      logEvent('library_work_view', { author: authorId, work_id: workId, tier: 'paid', accessor: accessor.github_login });
      return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'));
    }

    const obj = await r2.get(work.r2_key);
    if (!obj) return c.json({ error: 'Work content not found' }, 404);

    logEvent('library_work_view', { author: authorId, work_id: workId, tier: work.tier });

    return r2Response(obj.body, 'text/markdown; charset=utf-8', c.req.header('Origin'), 'public, max-age=300');
  });

  // =========================================================================
  // STATS (Author-authenticated)
  // =========================================================================

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
