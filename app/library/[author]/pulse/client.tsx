'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../../../components/ThemeProvider';

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
  h1: ({ children }: any) => <h1 style={{ fontSize: '1.3rem', fontWeight: 400, margin: '2rem 0 0.8rem', color: 'var(--text-primary)' }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ fontSize: '1rem', fontWeight: 400, margin: '1.8rem 0 0.6rem', color: 'var(--text-primary)' }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ fontSize: '0.88rem', fontWeight: 400, margin: '1.2rem 0 0.4rem', color: 'var(--text-muted)' }}>{children}</h3>,
  p: ({ children }: any) => <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.8, margin: '0 0 0.8rem' }}>{children}</p>,
  strong: ({ children }: any) => <strong style={{ fontWeight: 500 }}>{children}</strong>,
  li: ({ children }: any) => <li style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.7, margin: '0 0 0.3rem' }}>{children}</li>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '2rem 0' }} />,
};

interface PulseCard {
  alltime: { name: string; pct: number; why: string };
  this_month: Array<{ name: string; why: string }>;
  ideas: number;
  ideas_delta: number;
  themes?: string[];
  fragments?: Array<{ source: string; idea: string }> | string[];
  month: string;
}

export default function PulsePageClient({ params }: { params: Promise<{ author: string }> }) {
  const [authorId, setAuthorId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pulse, setPulse] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ author }) => {
      setAuthorId(author);
      fetch(`${SERVER_URL}/library/${author}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setDisplayName(d.author?.display_name || author); })
        .catch(() => {});
      fetch(`${SERVER_URL}/library/${author}/pulse?ref=pulse_page`)
        .then(r => { if (r.ok) return r.text(); return ''; })
        .then(text => { setPulse(text); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [params]);

  if (loading) return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-ghost)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>...</p>
    </main>
  );

  let pulseCard: PulseCard | null = null;
  try { pulseCard = JSON.parse(pulse); } catch {}

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <div style={{ margin: '0 0 3rem' }}>
          <a href={`/library/${authorId}`} style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', textDecoration: 'none', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            {displayName || authorId}
          </a>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 300, margin: '0.5rem 0 0', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            pulse
          </h1>
          {pulseCard?.month && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', margin: '0.3rem 0 0', letterSpacing: '0.05em' }}>{pulseCard.month}</p>
          )}
        </div>

        {pulseCard?.alltime ? (
          <>
            {/* Similarity card */}
            <section style={{ margin: '0 0 2.5rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 1rem' }}>similar thinker — all time</p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{pulseCard.alltime.name}</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-ghost)', fontWeight: 300 }}>{pulseCard.alltime.pct}%</span>
              </div>
              <div style={{ height: '2px', background: 'var(--border-light)', marginTop: '0.4rem', borderRadius: '1px' }}>
                <div style={{ height: '2px', background: 'var(--text-ghost)', width: `${pulseCard.alltime.pct}%`, borderRadius: '1px' }} />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', lineHeight: 1.6 }}>{pulseCard.alltime.why}</p>
            </section>

            {/* This month's thinkers */}
            {pulseCard.this_month.length > 0 && (
              <section style={{ margin: '0 0 2.5rem', padding: '1.5rem 0 0', borderTop: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 1rem' }}>similar thinkers — this month</p>
                {pulseCard.this_month.map((mind, i) => (
                  <div key={i} style={{ margin: '0 0 0.8rem' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{mind.name}</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', lineHeight: 1.5 }}>{mind.why}</p>
                  </div>
                ))}
              </section>
            )}

            {/* Fragments */}
            {(() => {
              const frags = pulseCard.fragments || pulseCard.themes;
              if (!frags || frags.length === 0) return null;
              return (
                <section style={{ margin: '0 0 2.5rem', padding: '1.5rem 0 0', borderTop: '1px solid var(--border-light)' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-ghost)', textTransform: 'uppercase', margin: '0 0 1rem' }}>fragments this month</p>
                  {frags.map((frag, i) => (
                    <div key={i} style={{ margin: '0 0 0.8rem' }}>
                      {typeof frag === 'string' ? (
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{frag}</p>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{frag.source}</span>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', margin: '0.2rem 0 0', lineHeight: 1.5 }}>{frag.idea}</p>
                        </>
                      )}
                    </div>
                  ))}
                </section>
              );
            })()}
          </>
        ) : pulse ? (
          <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.8 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{pulse}</ReactMarkdown>
          </div>
        ) : (
          <p style={{ color: 'var(--text-ghost)', fontSize: '0.88rem' }}>no pulse published yet.</p>
        )}

        <footer style={{ margin: '4rem 0 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <a href={`/library/${authorId}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">{displayName || authorId}</a>
          <a href="/library" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">library</a>
        </footer>

      </main>
    </>
  );
}
