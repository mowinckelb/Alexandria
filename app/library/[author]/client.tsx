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

interface SocialLink {
  platform: string;
  url: string;
}

interface AuthorData {
  author: {
    id: string;
    display_name: string | null;
    bio: string | null;
    settings: string;
    website: string | null;
    location: string | null;
    social_links: string | null;
  };
  shadows: Array<{ id: string; tier: string; size_bytes: number; updated_at: string }>;
  quizzes: Array<{ id: string; title: string; subtitle?: string; published_at: string }>;
  works: Array<{ id: string; title: string; medium: string; tier: string; url?: string; published_at: string }>;
  latest_pulse: { month: string } | null;
  shadow_chapters: string[];
}

interface AuthorStats {
  shadow_views: number;
  quiz_plays: number;
  quiz_share_views: number;
  referral_signups: number;
  total_earnings_cents: number;
}

export default function AuthorPageClient({ params }: { params: Promise<{ author: string }> }) {
  const [authorId, setAuthorId] = useState<string>('');
  const [data, setData] = useState<AuthorData | null>(null);
  const [shadow, setShadow] = useState<string>('');
  const [paidShadow, setPaidShadow] = useState<string>('');
  const [accessToken, setAccessToken] = useState<{ token: string; api_url: string } | null>(null);
  const [pulse, setPulse] = useState<string>('');
  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
      // Check for paid access via session_id — get API token + shadow content
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
      // Try to fetch stats (will 401/403 if not the owning Author)
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('alexandria_api_key') : null;
      if (apiKey) {
        fetch(`${SERVER_URL}/library/${author}/stats`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
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
  const socialLinks: SocialLink[] = author.social_links ? JSON.parse(author.social_links) : [];
  const signupRef = `ref=${encodeURIComponent(authorId)}&ref_source=library`;

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        {/* ── HEADER (substrate) ── */}
        <div style={{ margin: '0 0 4rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', margin: '0 0 0.3rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 400, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {displayName}
            </h1>
            {settings.library_id && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-whisper)', letterSpacing: '0.05em' }}>{settings.library_id}</span>
            )}
          </div>
          {(author.location || author.bio) && (
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.8, margin: '0' }}>
              {author.location && <span style={{ color: 'var(--text-ghost)' }}>{author.location}{author.bio ? ' \u00b7 ' : ''}</span>}
              {author.bio}
            </p>
          )}
        </div>

        {/* ── HOW THEY THINK ── */}
        {(pulse || shadow || paidShadow || data.quizzes.length > 0) && (
          <section style={{ margin: '0 0 4rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 2rem' }}>how they think</p>

            {/* Pulse */}
            {pulse && (
              <div style={{ margin: '0 0 3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: 0 }}>pulse</p>
                  <span onClick={() => setOpenInfo(openInfo === 'pulse' ? null : 'pulse')} style={{ fontSize: '0.6rem', color: 'var(--text-whisper)', cursor: 'pointer', opacity: 0.5 }}>ⓘ</span>
                </div>
                {openInfo === 'pulse' && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', fontStyle: 'italic', margin: '0 0 1rem', lineHeight: 1.6 }}>
                    my mind this month. auto-generated from the constitution.
                  </p>
                )}
                <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{pulse}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Shadow */}
            {(shadow || paidShadow) && (
              <div style={{ margin: '0 0 3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: 0 }}>shadow</p>
                  <span onClick={() => setOpenInfo(openInfo === 'shadow' ? null : 'shadow')} style={{ fontSize: '0.6rem', color: 'var(--text-whisper)', cursor: 'pointer', opacity: 0.5 }}>ⓘ</span>
                </div>
                {openInfo === 'shadow' && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', fontStyle: 'italic', margin: '0 0 1rem', lineHeight: 1.6 }}>
                    the full mind, published as a file. each chapter is a different dimension of how this person thinks.
                  </p>
                )}

                {accessToken ? (
                  <div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.7 }}>
                      your access token. give this url to any ai.
                    </p>
                    <div
                      onClick={() => {
                        navigator.clipboard.writeText(accessToken.api_url);
                        const el = document.getElementById('url-copied');
                        if (el) { el.textContent = 'copied'; setTimeout(() => { el.textContent = 'click to copy'; }, 2000); }
                      }}
                      style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', cursor: 'pointer', margin: '0 0 0.5rem' }}
                    >
                      <code style={{ fontSize: '0.7rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {accessToken.api_url}
                      </code>
                    </div>
                    <p id="url-copied" style={{ fontSize: '0.68rem', color: 'var(--text-ghost)', margin: '0 0 1.5rem' }}>click to copy</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', margin: '0 0 1.5rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                      paste the url into any ai chat. it will read the shadow and know this person. the token is yours — rate-limited, logged, revocable. always serves the latest version.
                    </p>
                    {paidShadow && (
                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <span
                          onClick={() => {
                            navigator.clipboard.writeText(paidShadow);
                            const el = document.getElementById('shadow-copied');
                            if (el) { el.textContent = 'copied'; setTimeout(() => { el.textContent = 'copy shadow to clipboard'; }, 2000); }
                          }}
                          id="shadow-copied"
                          style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                          className="hover:opacity-60"
                        >
                          copy shadow to clipboard
                        </span>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-whisper)', margin: '0.4rem 0 0', fontStyle: 'italic' }}>
                          if your ai can&apos;t fetch urls (gpt, gemini), paste the shadow directly into the chat instead.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {(data.shadow_chapters || []).map((title, i) => (
                        <span key={i} style={{ fontSize: '0.88rem', color: 'var(--text-ghost)', opacity: Math.max(0.3, 1 - (i * 0.08)) }}>{title}</span>
                      ))}
                    </div>
                    {hasPaid && (
                      <a
                        href={`/library/${authorId}/checkout/shadow`}
                        style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '1.5rem', textDecoration: 'none', transition: 'opacity 0.15s' }}
                        className="hover:opacity-60"
                      >
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-whisper)' }}>{authorId}.md</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-whisper)' }}>$</span>
                      </a>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Games */}
            {data.quizzes.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: 0 }}>games</p>
                  <span onClick={() => setOpenInfo(openInfo === 'games' ? null : 'games')} style={{ fontSize: '0.6rem', color: 'var(--text-whisper)', cursor: 'pointer', opacity: 0.5 }}>ⓘ</span>
                </div>
                {openInfo === 'games' && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', fontStyle: 'italic', margin: '0 0 1rem', lineHeight: 1.6 }}>
                    these exist because ai mapped how this person actually thinks. a side effect of something much bigger.
                  </p>
                )}
                {data.quizzes.map(quiz => (
                  <a
                    key={quiz.id}
                    href={`/library/${authorId}/quiz/${quiz.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 1.2rem', transition: 'opacity 0.15s' }}
                    className="hover:opacity-60"
                  >
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{quiz.title}</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── WHAT THEY DO ── */}
        {(data.works.length > 0 || author.website || socialLinks.length > 0) && (
          <section style={{ margin: '0 0 4rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 2rem' }}>what they do</p>

            {data.works.length > 0 && (
              <div style={{ margin: '0 0 2rem' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 1rem' }}>works</p>
                {data.works.map(work => {
                  const isPaid = work.tier === 'paid';
                  return (
                    <div
                      key={work.id}
                      onClick={() => {
                        if (isPaid) return;
                        window.open(work.url || `${SERVER_URL}/library/${authorId}/work/${work.id}`, '_blank');
                      }}
                      style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{work.title}</span>
                      {isPaid && <span style={{ fontSize: '0.72rem', color: 'var(--text-whisper)' }}>$</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {(author.website || socialLinks.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem' }}>
                {author.website && (
                  <a href={author.website} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                    className="hover:opacity-60"
                  >
                    {author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {socialLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                    className="hover:opacity-60"
                  >
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── AUTHOR STATS (visible only to owning Author) ── */}
        {stats && (
          <section style={{ margin: '0 0 4rem', padding: '1.5rem 0', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>your stats</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>{stats.shadow_views}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>shadow views</p>
              </div>
              <div>
                <p style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>{stats.quiz_plays}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>quiz plays</p>
              </div>
              <div>
                <p style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>{stats.quiz_share_views}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>share views</p>
              </div>
              <div>
                <p style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>{stats.referral_signups}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>signups</p>
              </div>
              {stats.total_earnings_cents > 0 && (
                <div>
                  <p style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontWeight: 300 }}>${(stats.total_earnings_cents / 100).toFixed(0)}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', letterSpacing: '0.05em' }}>earned</p>
                </div>
              )}
            </div>
          </section>
        )}

        <footer style={{ margin: '6rem 0 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <a href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</a>
          <a href="/library" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">library</a>
          <a href={`/signup?${signupRef}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">start yours</a>
        </footer>

      </main>
    </>
  );
}
