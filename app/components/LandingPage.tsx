'use client';

import { useState, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import WaitlistSection from './WaitlistSection';
import FooterSection from './FooterSection';
import ScrollPhilosophy from './ScrollPhilosophy';

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

function CopyConcreteButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch('/docs/Concrete.md');
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
      window.open('/docs/Concrete.md', '_blank');
    }
  }, []);

  return (
    <button
      onClick={handleCopy}
      className="bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-40 inline-flex items-center gap-1.5"
      style={{ color: 'var(--text-muted)', fontSize: 'inherit', fontFamily: 'inherit', letterSpacing: 'inherit' }}
    >
      {copied ? 'copied ✓' : (<>concrete <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></>)}
    </button>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      {/* Hero — pure minimal */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen relative">
        <div className="flex flex-col items-center" style={{ marginTop: '-4vh' }}>
          <h1 className="text-[1.5rem] sm:text-[1.7rem] font-normal leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
            alexandria.
          </h1>
          <p className="mt-1.5 text-[0.65rem] tracking-wide italic" style={{ color: 'var(--text-muted)' }}>
            droplets of grace
          </p>

          <div className="mt-14 sm:mt-16">
            <a
              href="/join"
              className="bg-transparent border-none cursor-pointer transition-opacity hover:opacity-60 no-underline cta-float"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="text-[1rem] sm:text-[1.15rem] tracking-wide font-medium">
                press here
              </span>
            </a>
          </div>

        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 scroll-hint">
          <span className="text-[0.7rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
            or keep scrolling
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', animation: 'bounce 2.5s ease-in-out infinite' }}>
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* The Frame — immediately after hero */}
      <section className="px-8 pt-16 sm:pt-24 pb-8">
        <div className="max-w-[520px] mx-auto flex flex-col items-center gap-6 text-center">
          <p className="text-[0.6rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
            the frame
          </p>
        </div>
      </section>

      <ScrollPhilosophy />

      {/* After the frame */}
      <section className="px-8 py-16 sm:py-24">
        <div className="max-w-[520px] mx-auto flex flex-col items-center gap-10 text-[0.78rem] tracking-wide">

          <div className="text-center pt-4" style={{ color: 'var(--text-ghost)' }}>
            <span className="text-[0.6rem] tracking-widest uppercase" style={{ letterSpacing: '0.2em' }}>investors</span>
            <p className="mt-3 text-[0.75rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
              <a href="tel:+4746643844" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-muted)' }}>call</a>
              {' / '}
              <a href="mailto:benjamin@mowinckel.com" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-muted)' }}>email</a>
            </p>
          </div>

        </div>
      </section>

      <FooterSection />
    </div>
  );
}
