'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../components/ThemeProvider';

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
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

export default function VisionPage() {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch('/docs/Vision.md').then(r => r.text()).then(setContent);
  }, []);

  if (content === null) return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh' }} />
  );

  return (
    <>
      <ThemeToggle />
      <main style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-eb-garamond)',
        minHeight: '100vh',
      }}>
        <div style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '2.5rem 2rem 0',
        }}>
          <div style={{
            fontSize: '0.82rem',
            color: 'var(--text-faint)',
          }}>
            the philosophy in plain English. ~20 min.
          </div>
        </div>

        <article
          className="pdoc pdoc-longform"
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: '2rem 2rem 3rem',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="pdoc-h1">{children}</h1>,
              h2: ({ children }) => <h2 className="pdoc-h2">{children}</h2>,
              h3: ({ children }) => <h3 className="pdoc-h3">{children}</h3>,
              h4: ({ children }) => <h4 className="pdoc-h4">{children}</h4>,
              hr: () => <div className="pdoc-hr" />,
              p: ({ children }) => <p className="pdoc-p">{children}</p>,
              strong: ({ children }) => <strong className="pdoc-strong">{children}</strong>,
              table: ({ children }) => <table className="pdoc-table">{children}</table>,
              blockquote: ({ children }) => <blockquote className="pdoc-bq">{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>

        <nav style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 2rem 4rem',
        }}>
          <a href="/" style={{ color: 'var(--text-ghost)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover:opacity-60 transition-opacity">
            a.
          </a>
        </nav>
      </main>
    </>
  );
}
