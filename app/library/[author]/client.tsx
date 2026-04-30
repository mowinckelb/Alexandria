'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../../components/ThemeToggle';
import type { PulseCard } from './types';
import { SERVER_URL, FETCH_TIMEOUT_MS } from '../../lib/config';

interface SocialLink { platform: string; url: string }

interface AuthorData {
  author: {
    id: string; display_name: string | null; bio: string | null; settings: string;
    website: string | null; location: string | null; social_links: string | null;
  };
  shadows: Array<{ id: string; visibility: string; price_cents: number; size_bytes: number; title?: string; updated_at: string }>;
  quizzes: Array<{ id: string; title: string; subtitle?: string; published_at: string }>;
  works: Array<{ id: string; title: string; medium: string; tier: string; url?: string; published_at: string }>;
  latest_pulse: { month: string } | null;
  shadow_chapters: string[];
}

interface AuthorStats {
  shadow_views: number; quiz_plays: number; quiz_share_views: number;
  referral_signups: number; total_earnings_cents: number;
}

export default function AuthorPageClient({ params }: { params: Promise<{ author: string }> }) {
  const [authorId, setAuthorId] = useState<string>('');
  const [data, setData] = useState<AuthorData | null>(null);
  const [shadow, setShadow] = useState<string>('');
  const [paidShadow, setPaidShadow] = useState<string>('');
  const [accessToken, setAccessToken] = useState<{ token: string; api_url: string } | null>(null);
  const [pulse, setPulse] = useState<string>('');
  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    params.then(({ author }) => {
      setAuthorId(author);
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      fetch(`${SERVER_URL}/library/${author}`, { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
        .then(d => { setData(d); setLoading(false); })
        .catch(e => { setError(e.name === 'AbortError' ? 'unreachable' : e.message); setLoading(false); })
        .finally(() => clearTimeout(timeout));
      fetch(`${SERVER_URL}/library/${author}/shadow/free?ref=author_page`)
        .then(r => { if (r.ok) return r.text(); return ''; })
        .then(text => setShadow(text))
        .catch(() => {});
      fetch(`${SERVER_URL}/library/${author}/pulse?ref=author_page`)
        .then(r => { if (r.ok) return r.text(); return ''; })
        .then(text => setPulse(text))
        .catch(() => {});
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      if (sessionId) {
        fetch(`${SERVER_URL}/library/${author}/access?session_id=${sessionId}`)
          .then(r => { if (r.ok) return r.json(); return null; })
          .then(data => {
            if (data?.token) {
              setAccessToken(data);
              fetch(data.api_url)
                .then(r => { if (r.ok) return r.text(); return ''; })
                .then(text => { if (text) setPaidShadow(text); })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('alexandria_api_key') : null;
      if (apiKey) {
        fetch(`${SERVER_URL}/library/${author}/stats`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
          .then(r => { if (r.ok) return r.json(); return null; })
          .then(d => { if (d) setStats(d); })
          .catch(() => {});
      }
    });
  }, [params]);

  if (loading) return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-ghost)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>...</p>
    </main>
  );

  if (error || !data) return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{error === 'unreachable' ? 'could not reach Alexandria.' : 'this mind is not yet published.'}</p>
      <p style={{ marginTop: '2rem' }}><Link href="/" style={{ color: 'var(--text-ghost)', textDecoration: 'none', fontSize: '0.8rem' }}>alexandria.</Link></p>
    </main>
  );

  const { author } = data;
  const displayName = author.display_name || author.id;
  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(author.settings || '{}'); } catch {}
  const libraryId = typeof settings['library_id'] === 'string' ? settings['library_id'] : null;
  const gatedShadow = data.shadows.find(s => s.visibility !== 'public');
  const publicShadow = data.shadows.find(s => s.visibility === 'public');
  const hasGated = !!gatedShadow;
  const hasPublic = !!publicShadow;
  let socialLinks: SocialLink[] = [];
  try { if (author.social_links) socialLinks = JSON.parse(author.social_links); } catch {}
  const signupRef = `ref=${encodeURIComponent(authorId)}&ref_source=library`;

  let pulseCard: PulseCard | null = null;
  try { pulseCard = JSON.parse(pulse); } catch {}

  const visibleQuizzes = showAllGames ? data.quizzes : data.quizzes.slice(0, 3);

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        {/* ── HEADER ── */}
        <div style={{ margin: '0 0 3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', margin: '0 0 0.3rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 400, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {displayName}
            </h1>
            {libraryId && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-whisper)', letterSpacing: '0.05em' }}>{libraryId}</span>
            )}
          </div>
          {author.location && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', margin: '0.3rem 0 0' }}>{author.location}</p>
          )}
          {socialLinks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', marginTop: '0.5rem' }}>
              {socialLinks.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >{link.platform}</a>
              ))}
            </div>
          )}
        </div>

        {/* ── HOW I THINK ── */}
        <section style={{ margin: '0 0 3rem' }}>
          <p style={{ fontSize: '1.15rem', fontWeight: 300, color: 'var(--text-primary)', margin: '0 0 2rem', letterSpacing: '-0.01em' }}>how i think</p>

          {/* Pulse — links to detail page */}
          {(pulseCard?.alltime || pulse) && (
            <div style={{ margin: '0 0 2rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>pulse</p>
              {pulseCard?.alltime && (
                <Link
                  href={`/library/${authorId}/pulse`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>similar thinker — {pulseCard.alltime.name}, {pulseCard.alltime.pct}%</span>
                </Link>
              )}
              {pulseCard?.fragments && pulseCard.fragments.length > 0 && (
                <Link
                  href={`/library/${authorId}/pulse`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>ideas this month — {pulseCard.fragments.slice(0, 3).map(f => f.source).join(', ')}, ...</span>
                </Link>
              )}
              {pulse && !pulseCard?.alltime && (
                <Link
                  href={`/library/${authorId}/pulse`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>view pulse</span>
                </Link>
              )}
            </div>
          )}

          {/* Games — show 3, chevron for more */}
          {data.quizzes.length > 0 && (
            <div style={{ margin: '0 0 2rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>games</p>
              {visibleQuizzes.map(quiz => (
                <Link
                  key={quiz.id}
                  href={`/library/${authorId}/quiz/${quiz.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{quiz.title}</span>
                </Link>
              ))}
              {data.quizzes.length > 3 && !showAllGames && (
                <span
                  onClick={() => setShowAllGames(true)}
                  style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  + {data.quizzes.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Shadows — free (copy) + paid */}
          {(hasPublic || hasGated) && (
            <div>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>shadows</p>

              {accessToken && paidShadow ? (
                <div
                  onClick={() => copyText(paidShadow, 'paid-shadow')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'opacity 0.15s', margin: '0 0 0.6rem' }}
                  className="hover:opacity-60"
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{gatedShadow?.title || 'the shadow'}</span>
                  {copiedId !== 'paid-shadow' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-ghost)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  {copiedId === 'paid-shadow' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {hasPublic && shadow && (
                    <div
                      onClick={() => copyText(shadow, 'free-shadow')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'opacity 0.15s', margin: '0 0 0.6rem' }}
                      className="hover:opacity-60"
                    >
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{publicShadow?.title || 'the shadow — free'}</span>
                      {copiedId !== 'free-shadow' && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-ghost)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                      {copiedId === 'free-shadow' && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  )}
                  {hasGated && (
                    <Link
                      href={`/library/${authorId}/checkout/shadow`}
                      style={{ fontSize: '0.88rem', color: 'var(--text-primary)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      {gatedShadow?.title || 'the full shadow'}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── WHAT I DO ── */}
        {(data.works.length > 0 || author.website || socialLinks.length > 0) && (
          <section style={{ margin: '0 0 3rem' }}>
            <p style={{ fontSize: '1.15rem', fontWeight: 300, color: 'var(--text-primary)', margin: '0 0 2rem', letterSpacing: '-0.01em' }}>what i do</p>

            {data.works.length > 0 && (
              <div style={{ margin: '0 0 1.5rem' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>works</p>
                {data.works.map(work => {
                  const isPaid = work.tier === 'paid';
                  if (isPaid) {
                    return (
                      <Link
                        key={work.id}
                        href={`/library/${authorId}/checkout/work?work_id=${work.id}`}
                        style={{ textDecoration: 'none', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                        className="hover:opacity-60"
                      >
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{work.title}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', marginLeft: '0.5rem' }}>premium</span>
                      </Link>
                    );
                  }
                  const externalHref = work.url || `${SERVER_URL}/library/${authorId}/work/${work.id}`;
                  return (
                    <a
                      key={work.id}
                      href={externalHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{work.title}</span>
                    </a>
                  );
                })}
              </div>
            )}

            {author.website && (
              <div>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>website</p>
                <a href={author.website} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  {author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </div>
            )}
          </section>
        )}

        {/* ── AUTHOR STATS (owner only) ── */}
        {stats && (
          <section style={{ margin: '0 0 2.5rem', padding: '1.5rem 0', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 1.5rem', letterSpacing: '-0.01em' }}>your stats</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem' }}>
              {[
                [stats.shadow_views, 'shadow views'],
                [stats.quiz_plays, 'quiz plays'],
                [stats.quiz_share_views, 'share views'],
                [stats.referral_signups, 'signups'],
              ].map(([val, label]) => (
                <div key={label as string}>
                  <p style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>{val}</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>{label}</p>
                </div>
              ))}
              {stats.total_earnings_cents > 0 && (
                <div>
                  <p style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>${(stats.total_earnings_cents / 100).toFixed(0)}</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>earned</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FOOTER ── */}
        <footer style={{ margin: '4rem 0 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <Link href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</Link>
          <a href={`${SERVER_URL}/auth/github?${signupRef}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">start yours</a>
        </footer>

      </main>
    </>
  );
}
