'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeProvider';

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

interface Author {
  id: string;
  display_name: string | null;
  bio: string | null;
  shadow_count: number;
  quiz_count: number;
  work_count: number;
}

export default function LibraryPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER_URL}/library/authors`)
      .then(r => r.json())
      .then(data => { setAuthors(data.authors || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 400, margin: '0 0 0.3rem', color: 'var(--text-primary)' }}>
          the library
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.8, margin: '0 0 4rem' }}>
          mentes aeternae.
        </p>

        {loading ? (
          <p style={{ color: 'var(--text-whisper)', fontSize: '0.85rem' }}>...</p>
        ) : authors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--text-ghost)', fontSize: '0.88rem', fontStyle: 'italic' }}>
              the shelves are empty.
            </p>
            <p style={{ color: 'var(--text-whisper)', fontSize: '0.8rem', marginTop: '2rem' }}>
              <a href="/join" style={{ color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">
                be the first.
              </a>
            </p>
          </div>
        ) : (
          <div>
            {authors.map(author => (
              <a
                key={author.id}
                href={`/library/${author.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 2.5rem', transition: 'opacity 0.15s' }}
                className="hover:opacity-60"
              >
                <p style={{ fontSize: '1.05rem', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                  {author.display_name || author.id}
                </p>
                {author.bio && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: '0.3rem 0 0' }}>
                    {author.bio}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}

        <footer style={{ marginTop: '6rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-whisper)' }}>
            <a href="/" style={{ color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</a>
          </p>
        </footer>

      </main>
    </>
  );
}
