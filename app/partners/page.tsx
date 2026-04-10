'use client';

import { useState, useCallback } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';

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

            <Item n={1} hint="the investment memo"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem' }}><Link href="/partners/memo">memo</Link><CopyMemo /></span></Item>
            <Item n={2} hint="schedule a meeting"><Link href="tel:+4746643844">call</Link></Item>
            <Item n={3} hint="the formal argument"><Link href="/partners/logic">logic</Link></Item>
            <Item n={4} hint="the assumptions"><Link href="/partners/numbers">numbers</Link></Item>
            <Item n={5} hint="in person, san francisco"><span style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>meet</span></Item>
            <Item n={6} hint="the company overview"><Link href="/partners/alexandria">alexandria.</Link></Item>

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
