'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '../components/ThemeProvider';
import FooterSection from '../components/FooterSection';

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
      style={{ color: 'var(--text-primary)', fontSize: 'inherit', fontFamily: 'inherit', letterSpacing: 'inherit' }}
    >
      {copied ? 'copied ✓' : (<>concrete <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></>)}
    </button>
  );
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

export default function JoinPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px]" style={{ marginTop: '-4vh' }}>

          <a href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </a>

          <div className="mt-14 sm:mt-16 space-y-10 text-[0.85rem] sm:text-[0.9rem] tracking-wide">

            {/* What is Alexandria — value, cost, action all in one */}
            <div>
              <p className="text-[0.95rem] sm:text-[1rem] tracking-wide font-medium mb-6" style={{ color: 'var(--text-primary)' }}>
                What is Alexandria?
              </p>
              <div className="space-y-4 leading-[1.9]" style={{ color: 'var(--text-primary)' }}>
                <p>You add one connection to Claude. Same Claude, same conversations &mdash; it just actually knows who you are now. No more feeling like you&rsquo;re talking to a stranger. Better answers. Better everything. There&rsquo;s a lot more to Alexandria &mdash; but it all starts with the file.</p>
                <p>Without it, everything Claude learns about you stays on their servers. They can sell it, delete it, or hold it hostage at 10x the price. With Alexandria, you own the file. On your device. Nobody can touch it.</p>
              </div>
            </div>

            {/* Action */}
            <div className="py-2">
              <a
                href="/onboarding"
                className="text-[1.05rem] sm:text-[1.15rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-primary)' }}
              >
                press here
              </a>
            </div>

            {/* Learn more */}
            <div className="pt-6 flex flex-col gap-3 text-[0.72rem] tracking-wide">
              <span style={{ color: 'var(--text-ghost)' }}>still not convinced?</span>
              <div className="flex flex-col gap-2">
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/#philosophy" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>frame</a>
                  {' '}&mdash; the argument in two minutes
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <CopyConcreteButton />
                  {' '}&mdash; paste into any AI and ask it anything
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/docs/Vision.pdf" target="_blank" rel="noopener noreferrer" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>vision</a>
                  {' '}&mdash; the philosophy in plain English
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/docs/abstract.pdf" target="_blank" rel="noopener noreferrer" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>abstract</a>
                  {' '}&mdash; the philosophy as written art
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
