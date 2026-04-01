'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../../components/ThemeProvider';

const DOCS: Record<string, { file: string; confidential?: boolean; purpose: string; time: string; aiDoc?: boolean }> = {
  memo: { file: '/partners/Memo.md', confidential: true, purpose: 'the investment memo', time: '7 min', aiDoc: true },
  numbers: { file: '/partners/Numbers.md', confidential: true, purpose: 'the assumptions', time: '2 min' },
  logic: { file: '/partners/Logic.md', confidential: true, purpose: 'the formal argument', time: '25 min' },
  alexandria: { file: '/partners/Alexandria.md', confidential: true, purpose: 'the company overview', time: '6 min' },
};

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

function prepareContent(doc: string, raw: string): string {
  if (doc === 'memo') {
    // Strip AI instruction header (before first ---)
    const idx = raw.indexOf('---');
    let content = idx !== -1 ? raw.slice(idx + 3).trimStart() : raw;
    // Strip hidden AI notes (after STOP marker)
    const stopIdx = content.indexOf('STOP');
    if (stopIdx !== -1) {
      // Walk back to the start of the line containing STOP
      let lineStart = stopIdx;
      while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;
      content = content.slice(0, lineStart).trimEnd();
    }
    // Remove trailing --- separator before STOP
    if (content.endsWith('---')) content = content.slice(0, -3).trimEnd();
    return content;
  }
  return raw;
}

// Detect paragraph types for Logic doc
function classifyParagraph(children: ReactNode): string {
  const text = extractText(children);
  if (/^P\d+[.\s]/.test(text)) return 'pdoc-premise';
  if (/^C\d+[:\s]/.test(text)) return 'pdoc-conclusion';
  if (/^\(/.test(text) && /\)$/.test(text.trim())) return 'pdoc-commentary';
  return 'pdoc-p';
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

export default function DocPage({ params }: { params: Promise<{ doc: string }> }) {
  const [content, setContent] = useState<string | null>(null);
  const [doc, setDoc] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    params.then(({ doc: d }) => {
      setDoc(d);
      const entry = DOCS[d];
      if (!entry) { setContent(''); return; }
      fetch(entry.file).then(r => r.text()).then(raw => {
        setContent(prepareContent(d, raw));
      });
    });
  }, [params]);

  const handleCopy = useCallback(async () => {
    const entry = DOCS[doc];
    if (!entry) return;
    try {
      const res = await fetch(entry.file);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }, [doc]);

  const entry = DOCS[doc];
  const isLongform = doc === 'memo' || doc === 'logic' || doc === 'alexandria';

  if (content === null) return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh' }} />
  );
  if (!entry) return (
    <main style={{
      background: 'var(--bg-primary)',
      color: 'var(--text-faint)',
      fontFamily: 'var(--font-eb-garamond)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      not found
    </main>
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
        {/* Header */}
        <div style={{
          maxWidth: isLongform ? '640px' : '740px',
          margin: '0 auto',
          padding: '2.5rem 2rem 0',
        }}>
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-ghost)',
            letterSpacing: '0.08em',
            marginBottom: '0.3rem',
          }}>
            confidential
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.4rem 1rem',
            fontSize: '0.82rem',
            color: 'var(--text-faint)',
          }}>
            <span>{entry.purpose}. {entry.time}.</span>
            {entry.aiDoc ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-ghost)', fontSize: '0.78rem' }}>
                paste into any ai to ask questions
                <button
                  onClick={handleCopy}
                  style={{ background: 'none', border: 'none', padding: '0.2rem', color: 'var(--text-ghost)', cursor: 'pointer', display: 'flex' }}
                  className="hover:opacity-60 transition-opacity"
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                <a
                  href={entry.file}
                  download
                  style={{ color: 'var(--text-ghost)', display: 'flex', padding: '0.2rem' }}
                  className="hover:opacity-60 transition-opacity"
                  aria-label="Download .md"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
              </span>
            ) : null}
          </div>
        </div>

        {/* Document */}
        <article
          className={`pdoc ${isLongform ? 'pdoc-longform' : ''} ${doc === 'logic' ? 'pdoc-logic' : ''}`}
          style={{
            maxWidth: isLongform ? '640px' : '740px',
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
              p: ({ children }) => {
                const cls = doc === 'logic' ? classifyParagraph(children) : 'pdoc-p';
                return <p className={cls}>{children}</p>;
              },
              strong: ({ children }) => <strong className="pdoc-strong">{children}</strong>,
              table: ({ children }) => <table className="pdoc-table">{children}</table>,
              blockquote: ({ children }) => <blockquote className="pdoc-bq">{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>

        {/* Footer nav */}
        <nav style={{
          maxWidth: isLongform ? '640px' : '740px',
          margin: '0 auto',
          padding: '0 2rem 4rem',
        }}>
          <a href="/partners" style={{ color: 'var(--text-ghost)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover:opacity-60 transition-opacity">
            a.
          </a>
        </nav>
      </main>
    </>
  );
}
