'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../../components/ThemeProvider';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://mcp.mowinckel.ai';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-[200] bg-transparent border-none cursor-pointer opacity-30 hover:opacity-50 transition-opacity p-0"
      style={{ color: 'var(--text-primary)' }}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
      )}
    </button>
  );
}

const mdComponents = {
  h1: ({ children }: any) => <h1 className="pdoc-h1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="pdoc-h2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="pdoc-h3">{children}</h3>,
  p: ({ children }: any) => <p className="pdoc-p">{children}</p>,
  strong: ({ children }: any) => <strong className="pdoc-strong">{children}</strong>,
  blockquote: ({ children }: any) => <blockquote className="pdoc-bq">{children}</blockquote>,
  hr: () => <hr className="pdoc-hr" />,
};

interface PulseCard {
  alltime: { name: string; pct: number; why: string };
  this_month: Array<{ name: string; why: string }>;
  ideas: number;
  ideas_delta: number;
  themes?: string[];
  month: string;
}

function PulseCardView({ card, authorName, authorId }: { card: PulseCard; authorName: string; authorId: string }) {
  return (
    <div style={{
      border: '1px solid var(--border-light)',
      borderRadius: '6px',
      padding: '1.5rem',
      maxWidth: '360px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 1.5rem' }}>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, fontWeight: 400 }}>{authorName}</p>
        <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: 0 }}>{card.month}</p>
      </div>

      {/* All-time closest mind */}
      <div style={{ margin: '0 0 1.2rem' }}>
        <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>similar thinker — all time</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{card.alltime.name}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-ghost)', fontWeight: 300 }}>{card.alltime.pct}%</span>
        </div>
        <div style={{ height: '2px', background: 'var(--border-light)', marginTop: '0.3rem', borderRadius: '1px' }}>
          <div style={{ height: '2px', background: 'var(--text-ghost)', width: `${card.alltime.pct}%`, borderRadius: '1px' }} />
        </div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.3rem 0 0', lineHeight: 1.5 }}>{card.alltime.why}</p>
      </div>

      {/* This month's thinking resembled */}
      <div style={{ margin: '0 0 1.5rem', padding: '0.8rem 0 0', borderTop: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.6rem' }}>similar thinkers — this month</p>
        {card.this_month.map((mind, i) => (
          <div key={i} style={{ margin: '0 0 0.5rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{mind.name}</span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', marginLeft: '0.5rem' }}>{mind.why}</span>
          </div>
        ))}
      </div>

      {/* Ideas — what this person holds in their head */}
      <div style={{ padding: '0.8rem 0 0', borderTop: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>ideas held</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 300 }}>{card.ideas}</span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', marginLeft: '0.4rem' }}>positions, mental models, and frameworks</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-ghost)' }}>+{card.ideas_delta}</span>
        </div>
        {card.themes && card.themes.length > 0 && (
          <p style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', margin: '0.4rem 0 0' }}>
            {card.themes.join(' · ')}
          </p>
        )}
      </div>

      <div style={{ margin: '1.2rem 0 0', padding: '0.8rem 0 0', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <a href={`/library/${authorId}`}
          style={{ fontSize: '0.58rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s', letterSpacing: '0.02em' }}
          className="hover:opacity-60"
        >mowinckel.ai/library/{authorId}</a>
        <a href={`/signup?ref=${authorId}&ref_source=library`}
          style={{ fontSize: '0.58rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s', letterSpacing: '0.02em' }}
          className="hover:opacity-60"
        >get yours at mowinckel.ai</a>
      </div>
    </div>
  );
}

interface SocialLink { platform: string; url: string }

interface AuthorData {
  author: {
    id: string; display_name: string | null; bio: string | null; settings: string;
    website: string | null; location: string | null; social_links: string | null;
  };
  shadows: Array<{ id: string; tier: string; size_bytes: number; updated_at: string }>;
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
      fetch(`${SERVER_URL}/library/${author}`)
        .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
        .then(d => { setData(d); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
      fetch(`${SERVER_URL}/library/${author}/shadow/free`)
        .then(r => { if (r.ok) return r.text(); return ''; })
        .then(text => setShadow(text))
        .catch(() => {});
      fetch(`${SERVER_URL}/library/${author}/pulse`)
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
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>this mind is not yet published.</p>
      <p style={{ marginTop: '2rem' }}><a href="/library" style={{ color: 'var(--text-ghost)', textDecoration: 'none', fontSize: '0.8rem' }}>library</a></p>
    </main>
  );

  const { author } = data;
  const displayName = author.display_name || author.id;
  const settings = JSON.parse(author.settings || '{}');
  const hasPaid = data.shadows.some(s => s.tier === 'paid');
  const hasFree = data.shadows.some(s => s.tier === 'free');
  const socialLinks: SocialLink[] = author.social_links ? JSON.parse(author.social_links) : [];
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
            {settings.library_id && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-whisper)', letterSpacing: '0.05em' }}>{settings.library_id}</span>
            )}
          </div>
          {author.location && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', margin: '0.3rem 0 0' }}>{author.location}</p>
          )}
          {(author.website || socialLinks.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', marginTop: '0.5rem' }}>
              {author.website && (
                <a href={author.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >{author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
              )}
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
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>how i think</p>

          {/* Pulse card — shows directly */}
          {pulseCard?.alltime && (
            <div style={{ margin: '0 0 2rem' }}>
              <PulseCardView card={pulseCard} authorName={displayName} authorId={authorId} />
            </div>
          )}
          {pulse && !pulseCard?.alltime && (
            <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.8, margin: '0 0 2rem' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{pulse}</ReactMarkdown>
            </div>
          )}

          {/* Games — show 3, chevron for more */}
          {data.quizzes.length > 0 && (
            <div style={{ margin: '0 0 2rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>games</p>
              {visibleQuizzes.map(quiz => (
                <a
                  key={quiz.id}
                  href={`/library/${authorId}/quiz/${quiz.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{quiz.title}</span>
                </a>
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

          {/* Shadow — free (copy) + premium (pay) */}
          {(hasFree || hasPaid) && (
            <div>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 0.8rem' }}>shadow</p>

              {accessToken ? (
                <div>
                  <div
                    onClick={() => copyText(accessToken.api_url, 'token')}
                    style={{ background: 'var(--bg-secondary)', padding: '0.8rem', borderRadius: '4px', cursor: 'pointer', margin: '0 0 0.3rem' }}
                  >
                    <code style={{ fontSize: '0.65rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {accessToken.api_url}
                    </code>
                  </div>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', margin: '0 0 1rem' }}>
                    {copiedId === 'token' ? 'copied' : 'click to copy — give this url to any ai'}
                  </p>
                  {paidShadow && (
                    <span
                      onClick={() => copyText(paidShadow, 'paid-shadow')}
                      style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      {copiedId === 'paid-shadow' ? 'copied' : 'copy shadow to clipboard'}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {hasFree && shadow && (
                    <span
                      onClick={() => copyText(shadow, 'free-shadow')}
                      style={{ fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      {copiedId === 'free-shadow' ? 'copied to clipboard' : `${displayName.split(' ')[0].toLowerCase()}.md`}
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', marginLeft: '0.5rem' }}>
                        {copiedId === 'free-shadow' ? '' : 'free — click to copy'}
                      </span>
                    </span>
                  )}
                  {hasPaid && (
                    <a
                      href={`/library/${authorId}/checkout/shadow`}
                      style={{ fontSize: '0.88rem', color: 'var(--text-primary)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      {authorId}.md
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', marginLeft: '0.5rem' }}>premium</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── WHAT I DO ── */}
        {(data.works.length > 0 || author.website || socialLinks.length > 0) && (
          <section style={{ margin: '0 0 3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>what i do</p>

            {data.works.map(work => {
              const isPaid = work.tier === 'paid';
              return (
                <a
                  key={work.id}
                  href={work.url || `${SERVER_URL}/library/${authorId}/work/${work.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block', margin: '0 0 0.6rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                  onClick={(e) => { if (isPaid) { e.preventDefault(); } }}
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{work.title}</span>
                  {isPaid && <span style={{ fontSize: '0.62rem', color: 'var(--text-ghost)', marginLeft: '0.5rem' }}>premium</span>}
                </a>
              );
            })}

            {author.website && (
              <a href={author.website} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', margin: '0.6rem 0 0', fontSize: '0.88rem', color: 'var(--text-primary)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                className="hover:opacity-60"
              >
                {author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </section>
        )}

        {/* ── AUTHOR STATS (owner only) ── */}
        {stats && (
          <section style={{ margin: '0 0 2.5rem', padding: '1.5rem 0', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>your stats</p>
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
          <a href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</a>
          <a href="/library" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">library</a>
          <a href={`/signup?${signupRef}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">start yours</a>
        </footer>

      </main>
    </>
  );
}
