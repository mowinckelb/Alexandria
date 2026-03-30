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

interface AuthorData {
  author: { id: string; display_name: string | null; bio: string | null; settings: string };
  shadows: Array<{ id: string; tier: string; size_bytes: number; updated_at: string }>;
  quizzes: Array<{ id: string; title: string; published_at: string }>;
  works: Array<{ id: string; title: string; medium: string; tier: string; published_at: string }>;
  latest_pulse: { month: string } | null;
}

export default function AuthorPageClient({ params }: { params: Promise<{ author: string }> }) {
  const [authorId, setAuthorId] = useState<string>('');
  const [data, setData] = useState<AuthorData | null>(null);
  const [shadow, setShadow] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
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
  const paidPriceCents = settings.paid_price_cents;
  const hasPaid = data.shadows.some(s => s.tier === 'paid');

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 400, margin: '0 0 0.3rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {displayName}
        </h1>
        {author.bio && (
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.8, margin: '0' }}>
            {author.bio}
          </p>
        )}

        {pulse && (
          <section style={{ margin: '4rem 0' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>
              pulse{data.latest_pulse?.month ? ` \u00b7 ${data.latest_pulse.month}` : ''}
            </p>
            <article className="pdoc pdoc-longform">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{pulse}</ReactMarkdown>
            </article>
          </section>
        )}

        {shadow && (
          <section style={{ margin: '4rem 0' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>
              shadow
            </p>
            <article className="pdoc pdoc-longform">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{shadow}</ReactMarkdown>
            </article>
            {hasPaid && paidPriceCents && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-ghost)', margin: '2rem 0 0', fontStyle: 'italic' }}>
                there is more. <span style={{ color: 'var(--text-whisper)' }}>${(paidPriceCents / 100).toFixed(2)}</span>
              </p>
            )}
          </section>
        )}

        {data.quizzes.length > 0 && (
          <section style={{ margin: '4rem 0' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>
              games
            </p>
            {data.quizzes.map(quiz => (
              <a
                key={quiz.id}
                href={`/library/${authorId}/quiz/${quiz.id}`}
                style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'block', margin: '0 0 1rem', transition: 'opacity 0.15s' }}
                className="hover:opacity-60"
              >
                <span style={{ fontSize: '0.95rem' }}>{quiz.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-whisper)', marginLeft: '0.8rem' }}>play</span>
              </a>
            ))}
          </section>
        )}

        {data.works.length > 0 && (
          <section style={{ margin: '4rem 0' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>
              works
            </p>
            {data.works.map(work => (
              <div key={work.id} style={{ margin: '0 0 1rem' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{work.title}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', marginLeft: '0.8rem' }}>{work.medium}</span>
              </div>
            ))}
          </section>
        )}

        <footer style={{ margin: '6rem 0 0', textAlign: 'center' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', marginTop: '3rem' }}>
            <a href="/library" style={{ color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">a.</a>
          </p>
        </footer>

      </main>
    </>
  );
}
