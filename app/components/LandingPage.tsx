'use client';

import { useState } from 'react';
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

function DocLink({ label, files, copyable = false }: {
  label: string;
  files: { href: string; ext: string }[];
  copyable?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const mdFile = files.find(f => f.ext === 'md');

  const handleCopy = async () => {
    if (!mdFile) return;
    try {
      const res = await fetch(mdFile.href);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowMenu(false); }, 1500);
    } catch {
      window.open(mdFile.href, '_blank');
    }
  };

  const menuItemClass = "text-[0.65rem] tracking-wider no-underline transition-opacity hover:opacity-40";
  const menuItemStyle = { color: 'var(--text-muted)', fontFamily: 'var(--font-eb-garamond)' };
  const dot = <span className="text-[0.3rem]" style={{ color: 'var(--text-whisper)' }}>&bull;</span>;

  return (
    <span className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide bg-transparent border-none cursor-pointer p-0"
        style={{ color: 'var(--text-primary)', opacity: 0.45, fontFamily: 'var(--font-eb-garamond)' }}
      >
        {label}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setShowMenu(false)} />
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-[100] flex flex-col items-center gap-2 py-3 px-5 rounded-lg whitespace-nowrap"
            style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            {copyable && mdFile && (
              <>
                <button
                  onClick={handleCopy}
                  className={`${menuItemClass} bg-transparent border-none cursor-pointer p-0`}
                  style={menuItemStyle}
                >
                  {copied ? 'copied' : 'copy to clipboard'}
                </button>
                {dot}
              </>
            )}
            {files.flatMap((f, i) => {
              const items = [];
              if (i > 0) items.push(<span key={`dot-pre-${f.ext}`} className="contents">{dot}</span>);
              items.push(
                <a
                  key={`open-${f.ext}`}
                  href={f.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={menuItemClass}
                  style={menuItemStyle}
                >
                  open .{f.ext}
                </a>
              );
              items.push(<span key={`dot-${f.ext}`} className="contents">{dot}</span>);
              items.push(
                <a
                  key={`dl-${f.ext}`}
                  href={f.href}
                  download
                  className={menuItemClass}
                  style={menuItemStyle}
                >
                  download .{f.ext}
                </a>
              );
              return items;
            })}
          </div>
        </>
      )}
    </span>
  );
}

export default function LandingPage({ confidential = false }: LandingPageProps) {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
              <DocLink
                label="abstract"
                files={[{ href: '/docs/Alexandria.pdf', ext: 'pdf' }]}
              />
              <span className="text-[0.35rem]" style={{ color: 'var(--text-ghost)' }}>&bull;</span>
              <DocLink
                label="concrete"
                files={[
                  { href: confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md', ext: 'md' },
                ]}
                copyable
              />
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
