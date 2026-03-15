'use client';

import { useState, useCallback, useEffect } from 'react';
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

function InvestorSection() {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-[0.6rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
        investors
      </p>
      <p className="text-[0.82rem] tracking-wide text-center leading-relaxed max-w-[320px]" style={{ color: 'var(--text-muted)' }}>
        if you have five minutes right now, just{' '}
        <a href="tel:+4746643844" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>call me</a>
        {' / '}
        <a href="mailto:benjamin@mowinckel.com" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>email</a>
        .
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[0.72rem] tracking-wide italic" style={{ color: 'var(--text-ghost)' }}>
          or just leave your email &mdash;
        </span>
        <WaitlistSection inline source="investor" />
      </div>
    </div>
  );
}

// 0 = click here
// 1 = "copied."
// 2 = "paste into any AI chat."
// 3 = "ask it anything. come back after."
// 4 = lingering
type Phase = 0 | 1 | 2 | 3 | 4;

export default function LandingPage() {
  const [phase, setPhase] = useState<Phase>(0);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const blobPromise = fetch('/docs/Concrete.md').then(r => r.text()).then(t => new Blob([t], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })]);
      } else {
        const res = await fetch('/docs/Concrete.md');
        const text = await res.text();
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setPhase(1);
    } catch {
      window.open('/docs/Concrete.md', '_blank');
    }
  }, []);

  useEffect(() => {
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 3000);
      return () => clearTimeout(t);
    }
    if (phase === 2) {
      const t = setTimeout(() => setPhase(3), 5000);
      return () => clearTimeout(t);
    }
    if (phase === 3) {
      const t = setTimeout(() => setPhase(4), 10000);
      return () => clearTimeout(t);
    }
    if (phase === 4) {
      const t = setTimeout(() => setPhase(0), 10000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen relative">
        <div className="flex flex-col items-center" style={{ marginTop: '-4vh' }}>

          {/* Logo */}
          <div className="flex flex-col items-center">
            <h1 className="text-[1.5rem] sm:text-[1.7rem] font-normal leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </h1>
            <p className="mt-1.5 text-[0.65rem] tracking-wide italic" style={{ color: 'var(--text-muted)' }}>
              droplets of grace
            </p>
          </div>

          {/* Phase widget */}
          <div className="flex flex-col items-center justify-center text-center mt-14 sm:mt-16" style={{ minHeight: '60px' }}>
            {phase === 0 && (
              <button
                onClick={handleCopy}
                className="bg-transparent border-none cursor-pointer transition-opacity hover:opacity-60 p-0 cta-float"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="text-[1rem] sm:text-[1.15rem] tracking-wide font-medium">
                  click here
                </span>
              </button>
            )}

            {phase === 1 && (
              <p className="text-[0.85rem] tracking-wide fade-in max-w-[260px]" style={{ color: 'var(--text-primary)' }}>
                you just copied everything about this company.
              </p>
            )}

            {phase === 2 && (
              <p className="text-[0.85rem] tracking-wide fade-in" style={{ color: 'var(--text-primary)' }}>
                paste it into any AI chat app.
              </p>
            )}

            {phase === 3 && (
              <p className="text-[0.85rem] tracking-wide fade-in max-w-[240px]" style={{ color: 'var(--text-muted)' }}>
                ask it anything. come back after.
              </p>
            )}

            {phase === 4 && (
              <p className="text-[0.85rem] tracking-wide italic fade-in" style={{ color: 'var(--text-ghost)' }}>
                you&rsquo;re still lingering...
              </p>
            )}
          </div>

          {/* Waitlist — always visible */}
          <div className="flex items-center gap-2 mt-12 sm:mt-14">
            <span className="text-[0.75rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
              join waitlist &mdash;
            </span>
            <WaitlistSection inline source="hero" />
          </div>
        </div>

        {/* Scroll nudge */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 scroll-hint">
          <span className="text-[0.7rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
            or keep scrolling
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', animation: 'bounce 2.5s ease-in-out infinite' }}>
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* Investor section — first thing after scroll */}
      <section className="px-8 py-16 sm:py-20">
        <InvestorSection />
      </section>

      {/* Philosophy intro */}
      <section className="px-8 pt-16 sm:pt-24 pb-8">
        <div className="max-w-[520px] mx-auto flex flex-col items-center gap-6 text-center">
          <p className="text-[0.6rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
            the philosophy
          </p>
          <p className="text-[0.85rem] sm:text-[0.9rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            There is a beautiful essay behind all of this &mdash; the{' '}
            <a href="/docs/Alexandria.pdf" target="_blank" rel="noopener noreferrer" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>
              Abstract
            </a>
            . Below is the plain English version.
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <ScrollPhilosophy />

      {/* Bottom — everything */}
      <section className="px-8 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-10">
          {/* Abstract */}
          <a
            href="/docs/Alexandria.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.78rem] tracking-wide no-underline transition-opacity hover:opacity-40"
            style={{ color: 'var(--text-muted)' }}
          >
            read the abstract
          </a>

          {/* Waitlist */}
          <div className="flex items-center gap-2">
            <span className="text-[0.75rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
              join waitlist &mdash;
            </span>
            <WaitlistSection inline source="bottom" />
          </div>

          {/* Investor */}
          <InvestorSection />
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
