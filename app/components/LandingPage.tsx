'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import WaitlistSection from './WaitlistSection';
import FooterSection from './FooterSection';

interface LandingPageProps {
  confidential?: boolean;
}

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// 0 = click here, 1 = go paste, 2 = lingering, 3 = welcome back (contacts)
type Phase = 0 | 1 | 2 | 3;

export default function LandingPage({ confidential = false }: LandingPageProps) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('alexandria-phase');
      if (saved === '1' || saved === '2' || saved === '3') return Number(saved) as Phase;
    }
    return 0;
  });

  useEffect(() => {
    sessionStorage.setItem('alexandria-phase', String(phase));
  }, [phase]);

  const handleCopy = useCallback(async () => {
    const href = confidential ? '/docs/confidential.concrete.md' : '/docs/concrete.md';
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const blobPromise = fetch(href).then(r => r.text()).then(t => new Blob(['Please present the following exactly as written, preserving bold formatting and structure:\n\n' + t], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })]);
      } else {
        const res = await fetch(href);
        const text = 'Please present the following exactly as written, preserving bold formatting and structure:\n\n' + await res.text();
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
      window.open(href, '_blank');
    }
  }, [confidential]);

  useEffect(() => {
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 12000);
      return () => clearTimeout(t);
    }
    if (phase === 2) {
      const t = setTimeout(() => setPhase(3), 12000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 pt-[30vh] pb-16">
        <div className="flex flex-col items-center gap-12 sm:gap-14">
          <div className="flex flex-col items-center">
            <h1 className="text-[1.5rem] sm:text-[1.7rem] font-normal leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </h1>
            <p className="mt-1.5 text-[0.65rem] tracking-wide italic" style={{ color: 'var(--text-muted)' }}>
              droplets of grace
            </p>
            {confidential && (
              <p className="mt-2 text-[0.55rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)' }}>
                confidential
              </p>
            )}
          </div>

          {/* Phase content — fixed height so nothing jolts */}
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '140px' }}>
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
              <div className="flex flex-col items-center gap-4 fade-in max-w-[320px]">
                <p className="text-[0.78rem] tracking-wide leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  you just copied a file with everything about this company.
                </p>
                <p className="text-[0.78rem] tracking-wide leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  open any AI chat app, press paste, press enter, and ask it anything you want.
                </p>
                <p className="text-[0.78rem] tracking-wide leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  come back after if you liked it. i have something for you.
                </p>
              </div>
            )}

            {phase === 2 && (
              <p className="text-[0.78rem] tracking-wide italic fade-in" style={{ color: 'var(--text-ghost)' }}>
                you're still lingering... please go.
              </p>
            )}

            {phase === 3 && (
              <div className="flex flex-col items-center gap-6 fade-in">
                <p className="text-[0.65rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)' }}>
                  welcome back
                </p>

                {confidential ? (
                  <div className="flex flex-col items-start gap-4">
                    <a
                      href="tel:+4746643844"
                      className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      call me &mdash; +47 466 43 844
                    </a>
                    <a
                      href="mailto:benjamin@mowinckel.com"
                      className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      or email &mdash; benjamin@mowinckel.com
                    </a>
                    <a
                      href="/docs/Alexandria.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      read the abstract
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
                        join waitlist &mdash;
                      </span>
                      <WaitlistSection inline source="public" />
                    </div>
                    <a
                      href="mailto:benjamin@mowinckel.com"
                      className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      invest &mdash; benjamin@mowinckel.com
                    </a>
                    <a
                      href="/docs/Alexandria.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      read the abstract
                    </a>
                  </div>
                )}

                <button
                  onClick={() => setPhase(0)}
                  className="bg-transparent border-none cursor-pointer transition-opacity hover:opacity-50 p-0 mt-2"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  <span className="text-[0.55rem] tracking-widest uppercase">
                    start over
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Persistent footer links — always accessible */}
      {phase !== 3 && (
        <section className="flex items-center justify-center gap-4 px-8 pb-8">
          {confidential && (
            <a href="tel:+4746643844" className="text-[0.6rem] no-underline transition-opacity hover:opacity-50" style={{ color: 'var(--text-muted)' }}>call</a>
          )}
          <a href="mailto:benjamin@mowinckel.com" className="text-[0.6rem] no-underline transition-opacity hover:opacity-50" style={{ color: 'var(--text-muted)' }}>email</a>
          <a href="/docs/Alexandria.pdf" target="_blank" rel="noopener noreferrer" className="text-[0.6rem] no-underline transition-opacity hover:opacity-50" style={{ color: 'var(--text-muted)' }}>abstract</a>
        </section>
      )}

      <FooterSection />
    </div>
  );
}
