'use client';

import { useState, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import ProductShowcase from './ProductShowcase';
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

function CopyButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(href);
      const text = await res.text();
      // Try modern clipboard API first, fall back to execCommand
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
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
      // Last resort: open the file
      window.open(href, '_blank');
    }
  }, [href]);

  return (
    <button
      onClick={handleCopy}
      className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
      style={{ color: copied ? 'var(--text-muted)' : 'var(--text-ghost)', transition: 'color 0.2s' }}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-[0.65rem] tracking-wider">copied</span>
        </>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function LandingPage({ confidential = false }: LandingPageProps) {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      {/* Hero — single screen */}
      <section className="min-h-screen flex flex-col items-center justify-center px-8 relative">
        <div className="flex flex-col items-center">
          {/* Title */}
          <h1
            className="text-[2.2rem] sm:text-[2.8rem] font-normal leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            alexandria.
          </h1>

          {/* Subtitle */}
          <p
            className="mt-2 text-[0.75rem] tracking-wide italic"
            style={{ color: 'var(--text-muted)' }}
          >
            droplets of grace
          </p>

          {confidential && (
            <p
              className="mt-3 text-[0.6rem] tracking-widest uppercase"
              style={{ color: 'var(--text-ghost)' }}
            >
              confidential
            </p>
          )}

          {/* Links + Waitlist */}
          <div className="mt-20 flex flex-col items-center gap-12">
            <div className="flex items-center gap-3">
              <a
                href="/docs/Alexandria.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
                style={{ color: 'var(--text-primary)', opacity: 0.45 }}
              >
                abstract
              </a>
              <span className="text-[0.35rem]" style={{ color: 'var(--text-ghost)' }}>&bull;</span>
              <span className="flex items-center gap-1.5">
                <a
                  href={confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
                  style={{ color: 'var(--text-primary)', opacity: 0.45 }}
                >
                  concrete
                </a>
                <CopyButton href={confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md'} />
              </span>
            </div>

            <WaitlistSection confidential={confidential} inline />

            {confidential && (
              <div className="flex flex-col items-center gap-1.5 text-[0.65rem]" style={{ color: 'var(--text-ghost)' }}>
                <a
                  href="mailto:benjamin@mowinckel.com"
                  className="no-underline tracking-wide transition-opacity hover:opacity-40"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  benjamin@mowinckel.com
                </a>
                <a
                  href="tel:+4746643844"
                  className="no-underline tracking-wide transition-opacity hover:opacity-40"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  +47 466 43 844
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#showcase" className="absolute bottom-10 flex flex-col items-center gap-2 no-underline cursor-pointer">
          <span className="text-[0.6rem] tracking-wider" style={{ color: 'var(--text-whisper)' }}>
            see what you build
          </span>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            style={{ color: 'var(--text-ghost)', animation: 'bounce 2.5s ease-in-out infinite' }}
          >
            <path d="M7 10l5 5 5-5" />
          </svg>
        </a>
      </section>

      {/* Product demo */}
      <div id="showcase">
        <ProductShowcase />
      </div>

      <FooterSection />
    </div>
  );
}
