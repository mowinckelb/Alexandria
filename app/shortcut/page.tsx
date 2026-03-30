'use client';

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

export default function ShortcutPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] flex flex-col items-center text-center">

          <a href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </a>

          <div className="mt-14 sm:mt-16 space-y-10">

            <div className="space-y-5">
              <p className="text-[0.9rem] sm:text-[0.95rem] tracking-wide leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
                voice memos, journals, articles, videos, podcasts
              </p>
              <p className="text-[0.85rem] sm:text-[0.9rem] tracking-wide leading-[1.9]" style={{ color: 'var(--text-muted)' }}>
                tap share, tap a. &mdash; it lands in your vault
              </p>
            </div>

            <a
              href="https://www.icloud.com/shortcuts/0ea1bb7333fd43a9881e9c7b9938a337"
              className="inline-block text-[1.05rem] sm:text-[1.15rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-primary)' }}
            >
              add shortcut
            </a>

            <p className="text-[0.85rem] sm:text-[0.9rem] tracking-wide leading-[1.9]" style={{ color: 'var(--text-muted)' }}>
              /a handles the rest
            </p>

          </div>
        </div>
      </section>
    </div>
  );
}
