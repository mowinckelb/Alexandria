'use client';

import { useState, useEffect } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { SERVER_URL, FETCH_TIMEOUT_MS } from '../lib/config';

interface Author {
  id: string;
  display_name: string | null;
  bio: string | null;
  settings: string | null;
  location: string | null;
  shadow_count: number;
  quiz_count: number;
  work_count: number;
}

export default function LibraryPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    fetch(`${SERVER_URL}/library/authors`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => { setAuthors(data.authors || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
    return () => clearTimeout(timeout);
  }, []);

  const locations = [...new Set(authors.map(a => a.location).filter(Boolean))] as string[];
  const filtered = search
    ? authors.filter(a => a.location?.toLowerCase().includes(search.toLowerCase()) || a.display_name?.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()))
    : authors;

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 400, margin: '0 0 0.3rem', color: 'var(--text-primary)' }}>
          the library
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.8, margin: '0 0 2rem' }}>
          mentes aeternae.
        </p>

        {/* Location filter */}
        {locations.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', margin: '0 0 1rem' }}>
            <span
              onClick={() => setSearch('')}
              style={{ fontSize: '0.68rem', color: !search ? 'var(--text-primary)' : 'var(--text-ghost)', cursor: 'pointer', transition: 'opacity 0.15s' }}
              className="hover:opacity-60"
            >all</span>
            {locations.map(loc => (
              <span
                key={loc}
                onClick={() => setSearch(search === loc ? '' : loc)}
                style={{ fontSize: '0.68rem', color: search === loc ? 'var(--text-primary)' : 'var(--text-ghost)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                className="hover:opacity-60"
              >{loc.toLowerCase()}</span>
            ))}
          </div>
        )}

        {/* Search */}
        {authors.length > 5 && (
          <input
            type="text"
            placeholder="search by name or city"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-eb-garamond)',
              width: '100%', padding: '0.4rem 0', outline: 'none', margin: '0 0 2rem',
            }}
          />
        )}

        <div style={{ marginTop: '1rem' }}>
          {loading ? (
            <p style={{ color: 'var(--text-whisper)', fontSize: '0.85rem' }}>...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ color: 'var(--text-ghost)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                {error ? 'could not reach Alexandria.' : authors.length === 0 ? 'the shelves are empty.' : 'no authors found.'}
              </p>
              {authors.length === 0 && (
                <p style={{ color: 'var(--text-whisper)', fontSize: '0.8rem', marginTop: '2rem' }}>
                  <a href="/join" style={{ color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">
                    be the first.
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div>
              {filtered.map(author => (
                <a
                  key={author.id}
                  href={`/library/${author.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', margin: '0 0 2.5rem', transition: 'opacity 0.15s' }}
                  className="hover:opacity-60"
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <p style={{ fontSize: '1.05rem', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                      {author.display_name || author.id}
                    </p>
                    {(() => { try { const s = JSON.parse(author.settings || '{}'); return s.library_id ? <span style={{ fontSize: '0.6rem', color: 'var(--text-whisper)', letterSpacing: '0.05em' }}>{s.library_id}</span> : null; } catch { return null; } })()}
                  </div>
                  {author.location && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', margin: '0.3rem 0 0' }}>
                      {author.location}
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        <footer style={{ marginTop: '6rem' }}>
          <a href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</a>
        </footer>

      </main>
    </>
  );
}
