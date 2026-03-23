'use client';

import { useState, useCallback } from 'react';
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

function CopyMemo() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch('/partners/Memo.md');
      const text = await res.text();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textarea.setSelectionRange(0, text.length);
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open('/partners/Memo.md', '_blank');
    }
  }, []);

  return (
    <button
      onClick={handleCopy}
      className="cursor-pointer transition-opacity hover:opacity-60"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-eb-garamond)',
        fontSize: '1.05rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
      }}
      aria-label="Copy memo to clipboard"
    >
      <span>{copied ? 'copied' : 'memo'}</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={copied ? 'var(--text-muted)' : 'var(--text-faint)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {copied ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
    </button>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http') || href.startsWith('/');
  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="transition-opacity hover:opacity-60"
      style={{
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '1.05rem',
      }}
    >
      {children}
    </a>
  );
}

function Num({ n }: { n: number }) {
  return (
    <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem', marginRight: '0.7rem', fontVariantNumeric: 'tabular-nums' }}>
      {n}.
    </span>
  );
}

function Item({ n, hint, children }: { n: number; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div><Num n={n} />{children}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginLeft: '1.45rem' }}>{hint}</div>
    </div>
  );
}

export default function PartnersPage() {
  return (
    <>
      <ThemeToggle />
      <main
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-eb-garamond)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '320px', width: '100%' }}>

          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-faint)',
            letterSpacing: '0.06em',
            marginBottom: '2.5rem',
          }}>
            confidential
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.6rem',
          }}>

            <Item n={1} hint="copy into any AI"><CopyMemo /></Item>
            <Item n={2} hint="schedule a conversation"><Link href="tel:+14155038178">call</Link></Item>
            <Item n={3} hint="the formal argument"><Link href="/partners/Logic.pdf">logic</Link></Item>
            <Item n={4} hint="the financial model"><Link href="/partners/Numbers.xlsx">numbers</Link></Item>
            <Item n={5} hint="in person, san francisco"><span style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>meet</span></Item>
            <Item n={6} hint="for your team"><Link href="/partners/alexandria.pdf">alexandria</Link></Item>

          </div>

          <div style={{
            marginTop: '3.5rem',
            fontSize: '1rem',
            color: 'var(--text-faint)',
            letterSpacing: '-0.01em',
          }}>
            a.
          </div>

        </div>
      </main>
    </>
  );
}
