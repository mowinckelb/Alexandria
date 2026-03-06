'use client';

import { useState, useCallback } from 'react';
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

function CopyButton({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const blobPromise = fetch(href).then(r => r.text()).then(t => new Blob([t], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })]);
      } else {
        const res = await fetch(href);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(href, '_blank');
    }
  }, [href]);

  return (
    <button
      onClick={handleCopy}
      className="bg-transparent border-none cursor-pointer flex items-center gap-2 transition-opacity hover:opacity-50"
      style={{ color: 'var(--text-primary)', opacity: copied ? 0.3 : 0.55 }}
    >
      <span className="text-[0.78rem] tracking-wide">{copied ? 'copied' : label}</span>
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[0.6rem] w-3 text-right" style={{ color: 'var(--text-ghost)' }}>{n}</span>
      {children}
    </div>
  );
}

export default function LandingPage({ confidential = false }: LandingPageProps) {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 pt-[30vh] pb-12">
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

          <div className="flex flex-col gap-5">
            <Step n={1}>
              <CopyButton
                href={confidential ? '/docs/confidential.concrete.md' : '/docs/concrete.md'}
                label="copy this"
              />
            </Step>

            <Step n={2}>
              <span className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
                paste into <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline transition-opacity hover:opacity-40"
                  style={{ color: 'var(--text-primary)', opacity: 0.55, borderBottom: '1px solid var(--border-dashed)' }}
                >claude</a>
              </span>
            </Step>

            {confidential ? (
              <>
                <Step n={3}>
                  <a
                    href="tel:+4746643844"
                    className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                    style={{ color: 'var(--text-primary)', opacity: 0.55 }}
                  >
                    call now &mdash; +47 466 43 844
                  </a>
                </Step>

                <Step n={4}>
                  <a
                    href="mailto:benjamin@mowinckel.com"
                    className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    or email &mdash; benjamin@mowinckel.com
                  </a>
                </Step>

                <Step n={5}>
                  <a
                    href="/docs/Alexandria.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    read the abstract
                  </a>
                </Step>
              </>
            ) : (
              <>
                <Step n={3}>
                  <span className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>join waitlist &mdash;</span>
                  <WaitlistSection inline source="public" />
                </Step>

                <Step n={4}>
                  <a
                    href="/docs/Alexandria.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.78rem] no-underline transition-opacity hover:opacity-40"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    read the abstract
                  </a>
                </Step>
              </>
            )}
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
